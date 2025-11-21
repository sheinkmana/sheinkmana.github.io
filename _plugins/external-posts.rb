# _plugins/external-posts.rb (updated)
require 'feedjira'
require 'feedjira/parsers/rss'    # explicitly load RSS parser
require 'feedjira/parsers/atom'   # explicitly load Atom parser
require 'httparty'
require 'jekyll'

module ExternalPosts
  class ExternalPostsGenerator < Jekyll::Generator
    safe true
    priority :high

    def generate(site)
      return unless site.config['external_sources']

      site.config['external_sources'].each do |src|
        p "Fetching external posts from #{src['name']}:"
        # provide a User-Agent to reduce chances of being served HTML
        response = HTTParty.get(src['rss_url'], headers: { 'User-Agent' => 'sheinkmana.github.io feed-fetcher' })
        xml = response.body.to_s

        # skip obviously non-XML responses
        if xml.strip.empty? || xml.lstrip.start_with?('<!doctype html', '<html')
          p "  Skipping #{src['rss_url']}: response is empty or HTML"
          next
        end

        begin
          feed = Feedjira.parse(xml)
        rescue Feedjira::NoParserAvailable => e
          p "  No parser available for feed at #{src['rss_url']}: #{e.message}. Skipping."
          next
        rescue StandardError => e
          p "  Error parsing feed at #{src['rss_url']}: #{e.class} #{e.message}. Skipping."
          next
        end

        next unless feed.respond_to?(:entries)

        feed.entries.each do |e|
          p "...fetching #{e.url}"
          slug = e.title.downcase.strip.gsub(' ', '-').gsub(/[^\w-]/, '')
          path = site.in_source_dir("_posts/#{slug}.md")
          doc = Jekyll::Document.new(
            path, { :site => site, :collection => site.collections['posts'] }
          )
          doc.data['external_source'] = src['name']
          doc.data['feed_content'] = e.content
          doc.data['title'] = "#{e.title}"
          doc.data['description'] = e.summary
          doc.data['date'] = e.published
          doc.data['redirect'] = e.url
          site.collections['posts'].docs << doc
        end
      end
    end
  end
end
