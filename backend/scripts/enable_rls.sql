-- Run ONCE in Supabase SQL Editor after the tables exist.
-- Blocks anyone from reading/writing your tables directly with the public key.
-- Your FastAPI backend connects as the database owner, so it is NOT affected.
ALTER TABLE public.profiles             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bicycles             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parking_zones        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rides                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hardware_devices     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hardware_commands    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.problem_reports      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_records  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ride_location_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs           ENABLE ROW LEVEL SECURITY;
