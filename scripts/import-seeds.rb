#!/usr/bin/env ruby
# frozen_string_literal: true

# Convert the original Rails seeds into normalized, newline-delimited JSON — the
# canonical, committed, text form of the dataset (see CLAUDE.md).
#
# The seeds come from the original *2015 oldams project* (which was built on
# Google Maps). They are plain Ruby: thousands of `Place.create(...)` and
# `Term.create(...)` calls. The most robust parser is Ruby itself, so we stub
# those two classes, load the file, and let the interpreter handle every quoting
# and \uXXXX-escape detail.
#
# Usage:
#   ruby scripts/import-seeds.rb [path/to/seeds.rb]
# Default seeds path: ../oldams-seeds/seeds.rb (sibling repo).

require "json"

REPO_ROOT = File.expand_path("..", __dir__)
seeds_path = File.expand_path(ARGV[0] || "../oldams-seeds/seeds.rb", REPO_ROOT)
out_dir = File.join(REPO_ROOT, "data")

RAW_PLACES = []
RAW_PHOTOS = []

# The seeds call `Place.create("id"=>1, ...)` / `Term.create(...)`, passing a
# single Hash. We just capture it.
class Place
  def self.create(attrs) = RAW_PLACES << attrs
end

# The seeds model is named `Term`; in this project it's a Photo.
class Term
  def self.create(attrs) = RAW_PHOTOS << attrs
end

abort "seeds not found: #{seeds_path}" unless File.exist?(seeds_path)
load seeds_path

# --- Normalize ------------------------------------------------------------
# Explicit, stable key order so NDJSON diffs cleanly across regenerations.

places = RAW_PLACES.map do |p|
  {
    "id" => p["id"]&.to_i,
    "address" => p["address"].to_s,
    "lat" => p["lat"]&.to_f,
    "lng" => p["lng"]&.to_f,
    "year_from" => p["year_from"]&.to_i,
    "year_to" => p["year_to"]&.to_i,
  }
end.sort_by { |p| p["id"] }

# `copyrighted` is always nil and `enclosure_type` always "image/jpeg" in the
# source, so both are dropped (constants, not data).
photos = RAW_PHOTOS.map do |t|
  {
    "id" => t["id"]&.to_i,
    "place_id" => t["place_id"]&.to_i,
    "guid" => t["guid"].to_s,
    "title" => t["title"].to_s,
    "description" => t["description"].to_s,
    "dt" => t["dt"].to_s,
    "creator" => t["creator"].to_s,
    "subject" => t["subject"].to_s,
    "provenance" => t["provenance"].to_s,
    "year" => t["year"]&.to_i,
    "year_from" => t["year_from"]&.to_i,
    "year_to" => t["year_to"]&.to_i,
    "width" => t["width"]&.to_i,
    "height" => t["height"]&.to_i,
    "enclosure_url" => t["enclosure_url"].to_s,
    "link" => t["link"].to_s,
  }
end.sort_by { |p| p["id"] }

# --- Validate -------------------------------------------------------------

place_ids = places.map { |p| p["id"] }.to_set
problems = []
problems << "duplicate place ids" if place_ids.size != places.size
problems << "duplicate photo ids" if photos.map { |p| p["id"] }.uniq.size != photos.size

no_place = photos.count { |p| p["place_id"].nil? || p["place_id"].zero? }
orphans = photos.select { |p| p["place_id"] && p["place_id"] != 0 && !place_ids.include?(p["place_id"]) }
bad_coord = places.count do |p|
  lat = p["lat"]
  lng = p["lng"]
  lat.nil? || lng.nil? || !(50..54).cover?(lat) || !(3..6).cover?(lng)
end

# --- Write ----------------------------------------------------------------

require "fileutils"
FileUtils.mkdir_p(out_dir)
File.write(File.join(out_dir, "places.ndjson"), places.map { |r| JSON.generate(r) }.join("\n") + "\n")
File.write(File.join(out_dir, "photos.ndjson"), photos.map { |r| JSON.generate(r) }.join("\n") + "\n")

# --- Report ---------------------------------------------------------------

years = photos.map { |p| p["year"] }.compact.reject(&:zero?)
puts "seeds:  #{seeds_path}"
puts "places: #{places.size}"
puts "photos: #{photos.size}"
puts "photos without place_id: #{no_place}"
puts "orphan photos (place_id missing): #{orphans.size}"
unless orphans.empty?
  puts "  sample missing place_ids: #{orphans.map { |o| o['place_id'] }.uniq.first(10).join(', ')}"
end
puts "places with out-of-range coords: #{bad_coord}"
puts "photo year range: #{years.min}-#{years.max}"
puts "wrote data/places.ndjson, data/photos.ndjson"

unless problems.empty?
  warn "VALIDATION PROBLEMS: #{problems.join('; ')}"
  exit 1
end
