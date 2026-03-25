const express = require("express");
const router = express.Router();
const supabase = require("../../config/db");
const authMiddleware = require("../../middlewares/auth.middleware");

router.use(authMiddleware);

router.get("/", async (req, res) => {
  const { data, error } = await supabase
    .from("collection_rules")
    .select("*")
    .eq("tenant_id", req.user.tenantId)
    .order("days_after_due");
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.post("/", async (req, res) => {
  const { days_after_due, message_template, active } = req.body;
  const { data, error } = await supabase
    .from("collection_rules")
    .insert({
      tenant_id: req.user.tenantId,
      days_after_due,
      message_template,
      active: active ?? true,
    })
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

router.put("/:id", async (req, res) => {
  const { days_after_due, message_template, active } = req.body;
  const { data, error } = await supabase
    .from("collection_rules")
    .update({ days_after_due, message_template, active })
    .eq("id", req.params.id)
    .eq("tenant_id", req.user.tenantId)
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.delete("/:id", async (req, res) => {
  const { error } = await supabase
    .from("collection_rules")
    .delete()
    .eq("id", req.params.id)
    .eq("tenant_id", req.user.tenantId);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

module.exports = router;
