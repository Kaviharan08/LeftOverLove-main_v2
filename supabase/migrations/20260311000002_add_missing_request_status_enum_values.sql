-- Fix: request_status enum was missing volunteer_requested, volunteer_accepted, and confirmed
-- These are required for the volunteer delivery flow and pickup confirmation flow.
-- Original enum only had: pending, accepted, picked_up, delivered, cancelled

ALTER TYPE public.request_status ADD VALUE IF NOT EXISTS 'volunteer_requested';
ALTER TYPE public.request_status ADD VALUE IF NOT EXISTS 'volunteer_accepted';
ALTER TYPE public.request_status ADD VALUE IF NOT EXISTS 'confirmed';
