// router/routes.js
const express = require('express');
const router = express.Router();
const boardController = require('../controller/boardController');
const taskController = require('../controller/taskController');

// Rute untuk membuat board baru 
// penggunaan di API Postman /cmd : http://localhost:3000/createBoard
router.post('/createBoard', boardController.createBoard);

// Rute untuk mengupdate nama board baru 
// penggunaan di API Postman /cmd : http://localhost:3000/updateBoard
router.patch('/updateBoard', boardController.updateBoard);

// Rute untuk menambahkan anggota baru ke dalam board (invite user)
router.post('/addUserToBoard', boardController.addUserToBoard);

// Rute untuk mengeluarkan / menghapus anggota dari suatu board (BoardMembers)
router.post('/removeUserFromBoard', boardController.removeUserFromBoard);

// // Rute untuk mendapatkan semua board yang terkait dengan pengguna
// router.get('/getAllBoardsForUser', boardController.getAllBoardsForUser);

// // Rute untuk mendapatkan detail board beserta task yang ada di dalamnya
// router.get('/getBoardDetails/:userId/:boardId', boardController.getBoardDetails);

// Rute untuk membuat / mengcreate Task baru dalam suatu board
router.post('/createTask/:userId/:boardId', async (req, res) => {
    try {
      const { userId, boardId } = req.params;
      const { title, description } = req.body;
  
      const result = await taskController.createTask(userId, boardId, title, description);
  
      if (result.success) {
        res.status(201).json({ message: "Task berhasil dibuat", newTitle: result.newTitle });
      } else {
        res.status(403).json({ message: result.message });
      }
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Terjadi kesalahan saat membuat task" });
    }
  });  
  
module.exports = router;
