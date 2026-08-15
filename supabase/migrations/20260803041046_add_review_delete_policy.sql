/*
# Add delete policy for own reviews

## Changes
- Add DELETE policy allowing authenticated users to delete their own reviews
*/

DROP POLICY IF EXISTS "delete_own_review" ON reviews;
CREATE POLICY "delete_own_review"
ON reviews FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
