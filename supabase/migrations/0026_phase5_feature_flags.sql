insert into public.feature_flags (key, enabled, description, rollout_percentage) values
  ('delivery_enabled', true, 'Offer delivery as an order channel in the customer app', 100),
  ('whatsapp_notifications', false, 'Send order-status updates via WhatsApp (needs Twilio Business API config)', 0),
  ('loyalty_points', true, 'Show and accrue loyalty points on the customer dashboard', 100),
  ('maintenance_mode', false, 'Block new customer orders behind a branded maintenance overlay', 100)
on conflict (key) do nothing;
