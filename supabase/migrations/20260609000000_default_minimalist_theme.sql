-- Migration: Add Default Minimalist Theme to all organizations
-- Adds a predefined minimalist layout schema as a draft theme for all existing organizations and ensures newly created organizations receive it.

-- 1. Helper variable containing the layout schema JSON
CREATE OR REPLACE FUNCTION public.get_default_minimalist_schema()
RETURNS jsonb AS $$
BEGIN
  RETURN '{
    "version": 1,
    "canvas": {
      "width": 1280,
      "height": 800,
      "orientation": "landscape",
      "overlayMode": false,
      "backgroundColor": "#FAF8F6",
      "enabledPages": ["landing", "template", "camera", "preview", "thanks"],
      "paymentModal": {
        "widthRatio": 0.406,
        "heightRatio": 0.75,
        "barrierColor": "#1B1B1B",
        "borderRadius": 20,
        "backgroundColor": "#FAF8F2"
      }
    },
    "pages": {
      "landing": [
        {
          "id": "ld-title",
          "type": "text",
          "page": "landing",
          "x": 80,
          "y": 180,
          "width": 600,
          "height": 60,
          "locked": false,
          "zIndex": 10,
          "opacity": 1,
          "visible": true,
          "rotation": 0,
          "props": { "color": "#18181b", "content": "POSKART", "fontSize": 48, "fontWeight": 700 }
        },
        {
          "id": "ld-tagline",
          "type": "text",
          "page": "landing",
          "x": 80,
          "y": 260,
          "width": 600,
          "height": 140,
          "locked": false,
          "zIndex": 10,
          "opacity": 1,
          "visible": true,
          "rotation": 0,
          "props": { "color": "#18181b", "content": "Abadikan momen.\nCetak seketika.", "fontSize": 56, "fontWeight": 700 }
        },
        {
          "id": "ld-desc",
          "type": "text",
          "page": "landing",
          "x": 80,
          "y": 420,
          "width": 550,
          "height": 60,
          "locked": false,
          "zIndex": 10,
          "opacity": 0.7,
          "visible": true,
          "rotation": 0,
          "props": { "color": "#52525b", "content": "Pilih paket, tentukan frame, lalu biarkan kamera menangkap momen terbaikmu.", "fontSize": 16 }
        },
        {
          "id": "ld-start-btn",
          "type": "button",
          "page": "landing",
          "x": 80,
          "y": 510,
          "width": 240,
          "height": 64,
          "locked": false,
          "zIndex": 12,
          "opacity": 1,
          "visible": true,
          "rotation": 0,
          "props": { "color": "#ffffff", "label": "Mulai sesi foto", "radius": 14, "fontSize": 16, "background": "#18181b", "semanticRole": "landing.start_session" }
        },
        {
          "id": "ld-camera-deco",
          "type": "image",
          "page": "landing",
          "x": 760,
          "y": 180,
          "width": 440,
          "height": 440,
          "locked": false,
          "zIndex": 5,
          "opacity": 0.08,
          "visible": true,
          "rotation": 0,
          "props": { "src": "https://gpoidunkwhewgfhepcnc.supabase.co/storage/v1/object/public/builder-assets/builder/images/camera_icon_deco.png", "radius": 24 }
        }
      ],
      "template": [
        {
          "id": "tp-title",
          "type": "text",
          "page": "template",
          "x": 80,
          "y": 60,
          "width": 400,
          "height": 50,
          "locked": false,
          "zIndex": 10,
          "opacity": 1,
          "visible": true,
          "rotation": 0,
          "props": { "color": "#18181b", "content": "Pilih Template", "fontSize": 36, "fontWeight": 700 }
        },
        {
          "id": "tp-subtitle",
          "type": "text",
          "page": "template",
          "x": 80,
          "y": 110,
          "width": 400,
          "height": 30,
          "locked": false,
          "zIndex": 10,
          "opacity": 0.6,
          "visible": true,
          "rotation": 0,
          "props": { "color": "#52525b", "content": "frame postcard kamu", "fontSize": 18, "fontStyle": "italic" }
        },
        {
          "id": "tp-preview",
          "type": "template-preview",
          "page": "template",
          "x": 80,
          "y": 170,
          "width": 420,
          "height": 500,
          "locked": false,
          "zIndex": 10,
          "opacity": 1,
          "visible": true,
          "rotation": 0,
          "props": { "semanticRole": "template.select" }
        },
        {
          "id": "tp-list",
          "type": "template-list",
          "page": "template",
          "x": 560,
          "y": 170,
          "width": 640,
          "height": 500,
          "locked": false,
          "zIndex": 10,
          "opacity": 1,
          "visible": true,
          "rotation": 0,
          "props": { "columns": 2, "tileCount": 4 }
        },
        {
          "id": "tp-back",
          "type": "button",
          "page": "template",
          "x": 80,
          "y": 700,
          "width": 150,
          "height": 48,
          "locked": false,
          "zIndex": 10,
          "opacity": 1,
          "visible": true,
          "rotation": 0,
          "props": { "color": "#18181b", "label": "← Kembali", "radius": 12, "background": "transparent", "semanticRole": "template.back" }
        },
        {
          "id": "tp-continue",
          "type": "button",
          "page": "template",
          "x": 1020,
          "y": 690,
          "width": 180,
          "height": 56,
          "locked": false,
          "zIndex": 10,
          "opacity": 1,
          "visible": true,
          "rotation": 0,
          "props": { "color": "#ffffff", "label": "Lanjutkan →", "radius": 14, "fontSize": 15, "background": "#18181b", "semanticRole": "template.continue" }
        }
      ],
      "camera": [
        {
          "id": "cam-view",
          "type": "camera-view",
          "page": "camera",
          "x": 80,
          "y": 80,
          "width": 840,
          "height": 560,
          "locked": false,
          "zIndex": 5,
          "opacity": 1,
          "visible": true,
          "rotation": 0,
          "props": { "radius": 16 }
        },
        {
          "id": "cam-take-photo",
          "type": "button",
          "page": "camera",
          "x": 980,
          "y": 280,
          "width": 160,
          "height": 160,
          "locked": false,
          "zIndex": 10,
          "opacity": 1,
          "visible": true,
          "rotation": 0,
          "props": { "color": "#ffffff", "label": "Take Photo", "radius": 80, "fontSize": 16, "background": "#18181b", "semanticRole": "camera.take_photo" }
        }
      ],
      "preview": [
        {
          "id": "pv-frame",
          "type": "frame-preview",
          "page": "preview",
          "x": 80,
          "y": 80,
          "width": 440,
          "height": 580,
          "locked": false,
          "zIndex": 8,
          "opacity": 1,
          "visible": true,
          "rotation": 0,
          "props": { "radius": 16 }
        },
        {
          "id": "pv-print",
          "type": "button",
          "page": "preview",
          "x": 600,
          "y": 300,
          "width": 260,
          "height": 72,
          "locked": false,
          "zIndex": 10,
          "opacity": 1,
          "visible": true,
          "rotation": 0,
          "props": { "color": "#ffffff", "label": "Cetak Foto", "radius": 14, "background": "#18181b", "semanticRole": "preview.print" }
        },
        {
          "id": "pv-finish",
          "type": "button",
          "page": "preview",
          "x": 900,
          "y": 300,
          "width": 260,
          "height": 72,
          "locked": false,
          "zIndex": 10,
          "opacity": 1,
          "visible": true,
          "rotation": 0,
          "props": { "color": "#18181b", "label": "Selesai", "radius": 14, "background": "transparent", "semanticRole": "preview.finish" }
        }
      ],
      "thanks": [
        {
          "id": "th-title",
          "type": "text",
          "page": "thanks",
          "x": 80,
          "y": 240,
          "width": 600,
          "height": 60,
          "locked": false,
          "zIndex": 10,
          "opacity": 1,
          "visible": true,
          "rotation": 0,
          "props": { "color": "#18181b", "content": "Terima kasih!", "fontSize": 48, "fontWeight": 700 }
        },
        {
          "id": "th-desc",
          "type": "text",
          "page": "thanks",
          "x": 80,
          "y": 310,
          "width": 600,
          "height": 40,
          "locked": false,
          "zIndex": 10,
          "opacity": 0.7,
          "visible": true,
          "rotation": 0,
          "props": { "color": "#52525b", "content": "Foto kenangan kamu sedang dicetak.", "fontSize": 18 }
        },
        {
          "id": "th-countdown",
          "type": "return-countdown",
          "page": "thanks",
          "x": 80,
          "y": 420,
          "width": 300,
          "height": 44,
          "locked": false,
          "zIndex": 10,
          "opacity": 1,
          "visible": true,
          "rotation": 0,
          "props": { "semanticRole": "thanks.countdown_timer", "countdownText": "Kembali ke awal", "countdownSeconds": 8 }
        }
      ],
      "payment": []
    }
  }'::jsonb;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 2. Inject default minimalist layout schema for all existing organizations
DO $$
DECLARE
  org record;
  layout_id text;
BEGIN
  FOR org IN SELECT id FROM public.organizations LOOP
    layout_id := 'default-minimalist-' || org.id;
    
    INSERT INTO public.layout_schemas (id, name, status, schema, organization_id)
    VALUES (
      layout_id,
      'Minimalist',
      'published',
      public.get_default_minimalist_schema(),
      org.id
    )
    ON CONFLICT (id) DO UPDATE SET
      schema = EXCLUDED.schema,
      name = EXCLUDED.name,
      status = EXCLUDED.status;
  END LOOP;
END;
$$;

-- 3. Update trigger handle_new_user to auto-insert the theme upon registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  invited_org_id text;
  new_org_id text;
  platform_role text;
  layout_id text;
BEGIN
  -- Determine platform super admin role
  IF new.email IN ('rifqinaufal9009@gmail.com', 'admin@poskart.id', 'admin@poskart.my.id') THEN
    platform_role := 'admin';
  ELSE
    platform_role := 'user';
  END IF;

  -- Create profile
  INSERT INTO public.profiles (id, email, role)
  VALUES (new.id, new.email, platform_role);

  -- Check invitations
  SELECT organization_id INTO invited_org_id
  FROM public.organization_invitations
  WHERE lower(email) = lower(new.email)
  LIMIT 1;

  IF invited_org_id IS NOT NULL THEN
    -- Join organization as staff
    INSERT INTO public.organization_members (organization_id, profile_id, role)
    VALUES (invited_org_id, new.id, 'staff');
    
    DELETE FROM public.organization_invitations WHERE lower(email) = lower(new.email);
  ELSE
    -- Create new organization
    new_org_id := 'org_' || replace(gen_random_uuid()::text, '-', '');
    
    INSERT INTO public.organizations (id, name, plan, status, booths, users, renewal_date)
    VALUES (
      new_org_id,
      'Workspace - ' || split_part(new.email, '@', 1),
      'Free',
      'active',
      0,
      1,
      (current_date + interval '365 days')::date
    );

    -- Create subscription
    INSERT INTO public.subscriptions (organization_id, plan_id, status)
    VALUES (new_org_id, 'free', 'free');

    -- Join as owner
    INSERT INTO public.organization_members (organization_id, profile_id, role)
    VALUES (new_org_id, new.id, 'owner');

    -- Inject default minimalist theme layout schema
    layout_id := 'default-minimalist-' || new_org_id;
    INSERT INTO public.layout_schemas (id, name, status, schema, organization_id)
    VALUES (
      layout_id,
      'Minimalist',
      'published',
      public.get_default_minimalist_schema(),
      new_org_id
    ) ON CONFLICT DO NOTHING;
  END IF;
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
