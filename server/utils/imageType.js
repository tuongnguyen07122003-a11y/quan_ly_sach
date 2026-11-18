import fs from "fs";

// Kiểm tra nội dung thật của file (không tin phần đuôi file hay Content-Type do client gửi)
export function sniffImage(filePath) {
  const fd = fs.openSync(filePath, "r");
  const buf = Buffer.alloc(12);
  fs.readSync(fd, buf, 0, 12, 0);
  fs.closeSync(fd);
  const head4 = buf.subarray(0, 4);
  const jpg = buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  const png = head4.equals(Buffer.from([0x89, 0x50, 0x4e, 0x47]));
  const gif = head4.toString("ascii") === "GIF8";
  const webp = head4.toString("ascii") === "RIFF" && buf.subarray(8, 12).toString("ascii") === "WEBP";
  return jpg || png || gif || webp;
}
