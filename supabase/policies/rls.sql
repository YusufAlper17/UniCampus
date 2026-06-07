-- UniCampus RLS politikaları
-- Migration (Drizzle) sonrası uygulanır. Detay: docs/04-database-schema.md, docs/11-security-trust-safety.md
-- Amaç: üniversite izolasyonu + içerik görünürlüğü DB seviyesinde garanti.

-- ============ posts ============
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY posts_select ON posts FOR SELECT USING (
  university_id = (auth.jwt() ->> 'university_id')::uuid
  AND (
    visibility = 'public'
    OR author_id = auth.uid()
    OR (visibility = 'followers' AND EXISTS (
      SELECT 1 FROM follows f
      WHERE f.following_id = posts.author_id
        AND f.follower_id = auth.uid()
        AND f.status = 'active'))
    OR (visibility = 'connections' AND EXISTS (
      SELECT 1 FROM connections c
      WHERE c.user_a_id = LEAST(posts.author_id, auth.uid())
        AND c.user_b_id = GREATEST(posts.author_id, auth.uid())))
  )
);

CREATE POLICY posts_insert ON posts FOR INSERT WITH CHECK (
  author_id = auth.uid()
  AND university_id = (auth.jwt() ->> 'university_id')::uuid
);

CREATE POLICY posts_update_own ON posts FOR UPDATE USING (author_id = auth.uid());
CREATE POLICY posts_delete_own ON posts FOR DELETE USING (author_id = auth.uid());

-- ============ communities ============
ALTER TABLE communities ENABLE ROW LEVEL SECURITY;

CREATE POLICY communities_visible ON communities FOR SELECT USING (
  visibility = 'public'
  OR EXISTS (
    SELECT 1 FROM community_members cm
    WHERE cm.community_id = communities.id
      AND cm.user_id = auth.uid()
      AND cm.status = 'active')
);

-- ============ deals (monetizasyon) ============
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;

-- Aktif kampanyalar herkese okunur; yazma yalnızca service role (admin API).
CREATE POLICY deals_public_read ON deals FOR SELECT USING (status = 'active');
