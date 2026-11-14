/**
 * Lưu trữ ảnh upload của trang quản trị.
 *
 * Hiện dùng Vercel Blob (serverless không có ổ đĩa bền). Route upload chỉ gọi
 * `saveImage()`, nên khi cần đổi sang S3/R2 chỉ phải thay file này.
 */

const BLOB_PREFIX = process.env.BLOB_UPLOAD_PREFIX || "uploads";

/** Có cấu hình storage thì ảnh đi qua storage, không thì rơi về lưu đĩa (dev). */
function isEnabled() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

async function saveImage({ buffer, filename, contentType }) {
  // Nạp SDK trễ: dev/Render không cấu hình Blob thì không cần nạp package này.
  const { put } = require("@vercel/blob");

  const { url } = await put(`${BLOB_PREFIX}/${filename}`, buffer, {
    access: "public",
    contentType,
    addRandomSuffix: false,
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });

  return { url };
}

module.exports = { isEnabled, saveImage };
