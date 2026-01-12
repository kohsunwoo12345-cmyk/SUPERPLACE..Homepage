-- Add OG meta fields to landing pages
ALTER TABLE landing_pages ADD COLUMN og_title TEXT;
ALTER TABLE landing_pages ADD COLUMN og_description TEXT;
