const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
const port = 3000;

const getUploadDir = (fileType) => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const baseDir = path.join(__dirname, "./src/uploads");
  const subDir = fileType.startsWith("image/") ? "images" : "file";
  const uploadDir = path.join(baseDir, subDir, `${year}${month}${day}`);
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  return uploadDir;
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, getUploadDir(file.mimetype));
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "./src/uploads")));

app.post("/upload", upload.single("file"), (req, res) => {
  const fileType = req.file.mimetype.startsWith("image/") ? "images" : "file";
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  res.json({
    url: `/uploads/${fileType}/${year}${month}${day}/${req.file.filename}`,
  });
});

const deleteAllFiles = (dirPath) => {
  if (fs.existsSync(dirPath)) {
    fs.readdirSync(dirPath).forEach((file) => {
      const filePath = path.join(dirPath, file);
      if (fs.lstatSync(filePath).isDirectory()) {
        deleteAllFiles(filePath);
      } else {
        fs.unlinkSync(filePath);
      }
    });
  }
};

wss.on("connection", (ws) => {
  console.log(`Client connected`);

  ws.on("message", (message) => {
    const parsedMessage = JSON.parse(message);
    console.log(`Received message from: ${JSON.stringify(parsedMessage)}`);

    // 处理“正在输入...”消息
    if (parsedMessage.type === "typing") {
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN && client !== ws) {
          client.send(JSON.stringify(parsedMessage));
        }
      });
    } else {
      // 广播消息给所有客户端
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(parsedMessage));
        }
      });
    }
  });

  ws.on("close", () => {
    console.log(`Client disconnected`);
    deleteAllFiles(path.join(__dirname, "./src/uploads"));
  });
});

server.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
