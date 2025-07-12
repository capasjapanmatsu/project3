-- Check current park status and review stages
SELECT 
    dp.id,
    dp.name,
    dp.status,
    dp.created_at,
    dp.updated_at,
    p.name AS owner_name,
    p.email AS owner_email,
    dprs.first_stage_passed_at,
    dprs.second_stage_submitted_at,
    dprs.created_at AS review_stage_created,
    dprs.updated_at AS review_stage_updated
FROM dog_parks dp
LEFT JOIN profiles p ON dp.owner_id = p.id
LEFT JOIN dog_park_review_stages dprs ON dp.id = dprs.park_id
ORDER BY dp.created_at DESC;

-- Check facility images
SELECT 
    dp.name AS park_name,
    dpfi.image_type,
    dpfi.is_approved,
    dpfi.created_at,
    dpfi.admin_notes
FROM dog_parks dp
LEFT JOIN dog_park_facility_images dpfi ON dp.id = dpfi.park_id
ORDER BY dp.name, dpfi.created_at DESC; 