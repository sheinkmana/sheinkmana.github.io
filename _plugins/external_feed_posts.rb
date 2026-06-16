require "digest"
require "fileutils"
require "open-uri"
require "rss"
require "time"
require "uri"
require "yaml"

module ExternalFeedPosts
  module_function

  def generate(site)
    sources = Array(site.config["external_sources"]).select { |source| source["rss_url"] }
    return if sources.empty?

    output_dir = File.join(site.source, "_posts", "external")
    FileUtils.mkdir_p(output_dir)

    sources.each do |source|
      import_source(site, source, output_dir)
    end
  end

  def import_source(site, source, output_dir)
    feed = URI.open(source["rss_url"], read_timeout: 10) { |io| RSS::Parser.parse(io.read, false) }
    entries = Array(feed.items).first(source.fetch("limit", 10).to_i)

    entries.each do |entry|
      write_entry(site, source, output_dir, entry)
    end
  rescue StandardError => e
    Jekyll.logger.warn "External feed posts:", "Could not import #{source["rss_url"]}: #{e.message}"
  end

  def write_entry(site, source, output_dir, entry)
    url = entry.link || entry.guid&.content
    return if url.to_s.empty?

    published_at = entry.pubDate || Time.now
    published_at = Time.parse(published_at.to_s) unless published_at.respond_to?(:strftime)
    slug = slug_for(entry, url)
    path = File.join(output_dir, "#{published_at.strftime("%Y-%m-%d")}-#{slug}.md")

    front_matter = {
      "layout" => "post",
      "title" => clean_text(entry.title),
      "date" => published_at.strftime("%Y-%m-%d"),
      "description" => clean_text(entry.description),
      "external_source" => source.fetch("name", URI(source["rss_url"]).host),
      "tags" => tags_for(entry)
    }.compact

    content = entry.content_encoded || entry.description || ""
    body = "#{content}\n\n<hr>\n\nOriginally published on [#{front_matter["external_source"]}](#{url}).\n"
    File.write(path, "---\n#{front_matter.to_yaml.sub(/\A---\n/, "")}---\n\n#{body}")
  end

  def slug_for(entry, url)
    uri_slug = URI(url).path.split("/").reject(&:empty?).last
    raw_slug = uri_slug || entry.title || Digest::MD5.hexdigest(url)
    raw_slug.downcase.gsub(/[^a-z0-9]+/, "-").gsub(/\A-|-+\z/, "")
  rescue URI::InvalidURIError
    Digest::MD5.hexdigest(url)
  end

  def tags_for(entry)
    Array(entry.categories).map { |tag| clean_text(tag.content) }.reject(&:empty?)
  end

  def clean_text(value)
    value.to_s.gsub(/<[^>]*>/, "").gsub(/\s+/, " ").strip
  end
end

Jekyll::Hooks.register :site, :after_init do |site|
  ExternalFeedPosts.generate(site)
end
