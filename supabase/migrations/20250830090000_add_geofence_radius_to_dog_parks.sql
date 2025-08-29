-- Add geofence radius per park (km, supports decimal). Recommended default: 1.0 km
ALTER TABLE IF EXISTS public.dog_parks
  ADD COLUMN IF NOT EXISTS geofence_radius_km numeric(6,3) DEFAULT 1.0;

COMMENT ON COLUMN public.dog_parks.geofence_radius_km IS 'Geofence radius in kilometers for unlock eligibility (decimal supported). Recommended 1.0km.';


