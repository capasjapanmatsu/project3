-- 予約者名の既存データを補完し、以後自動で入るようにする

-- 1) 既存予約のcustomer_nameをprofilesから補完
UPDATE public.facility_reservations r
SET customer_name = COALESCE(p.nickname, p.full_name)
FROM public.profiles p
WHERE r.user_id = p.id
  AND (r.customer_name IS NULL OR r.customer_name = '');

-- 2) 以後のINSERTでcustomer_nameが未指定なら自動補完するトリガーを追加
CREATE OR REPLACE FUNCTION public.fn_fill_reservation_customer_name()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.customer_name IS NULL OR NEW.customer_name = '' THEN
    SELECT COALESCE(p.nickname, p.full_name) INTO NEW.customer_name
    FROM public.profiles p WHERE p.id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_fill_reservation_customer_name ON public.facility_reservations;
CREATE TRIGGER trg_fill_reservation_customer_name
  BEFORE INSERT ON public.facility_reservations
  FOR EACH ROW EXECUTE FUNCTION public.fn_fill_reservation_customer_name();

-- PostgRESTに通知
NOTIFY pgrst, 'reload schema';

