UPDATE agents
SET 
  pos_x = h.center_x,
  pos_z = h.center_z
FROM map_hubs AS h
WHERE agents.current_hub_id = h.id;