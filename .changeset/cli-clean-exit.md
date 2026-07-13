---
'@reuters-graphics/graphics-kit-publisher': patch
---

Fix CLI hanging for ~1–2 minutes after commands finished. The CLI now exits promptly once a command resolves instead of waiting on keep-alive sockets held open by dependencies (e.g. the AWS SDK S3 client).
