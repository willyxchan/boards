const { Users, Boards, BoardMembers, Tasks } = require('../database/models');

/* -------------------------------------------------------------------------------------------------------------
                  FUNGSI CREATE NEW BOARD / BOARD BARU - BERLAKU UNTUK SETIAP USER
--------------------------------------------------------------------------------------------------------------*/
const createBoard = async (req, res) => {
    try {
      const { userId, username } = req.body;
      const boardName = req.body.boardName || 'Nama Board Baru';
  
      // Periksa apakah seorang pengguna sudah memiliki board dengan nama yang sama
      const isBoardExist = await Boards.findOne({
        where: { OwnerId: userId, name: boardName },
      });
  
      if (isBoardExist) {
        return res.status(400).json({ message: "Anda sudah memiliki board dengan nama tersebut" });
      }
  
      // Buat board baru dengan isPublic diatur ke false secara default
      const newBoard = await Boards.create({
        OwnerId: userId,
        username: username,
        isPublic: false,
        name: boardName,
      });
  
      // Tambahkan pengguna sebagai admin dan mencatat keanggotaannya pada board tersebut
      await BoardMembers.create({
        UserId: userId,
        BoardId: newBoard.BoardId,
        role: 'admin',
      });
  
      // Jika board belum public dan ada anggota pertama, ubah isPublic menjadi true
      await updateBoardIsPublic(newBoard.BoardId);
  
      res.status(201).json({ message: "Board berhasil dibuat" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Terjadi kesalahan saat membuat board" });
    }
  };
/* -------------------------------------------------------------------------------------------------------------
                FUNGSI CREATE NEW BOARD / BOARD BARU - BERLAKU UNTUK SETIAP USER (END)
--------------------------------------------------------------------------------------------------------------*/


/* -------------------------------------------------------------------------------------------------------------
                FUNGSI PENGUBAHAN COLUMN isPublic menjadi true saat ada anggota baru ditambahkan
--------------------------------------------------------------------------------------------------------------*/
const updateBoardIsPublic = async (boardId) => {
  try {
    await Boards.update(
      { isPublic: true },
      { where: { BoardId: boardId } }
    );
    console.log(`Board dengan ID ${boardId} diubah menjadi public.`);
  } catch (error) {
    console.error(`Gagal mengubah status isPublic board: ${error}`);
  }
};

/* -------------------------------------------------------------------------------------------------------------
              FUNGSI PENGUBAHAN COLUMN isPublic menjadi true saat ada anggota baru ditambahkan (END)
--------------------------------------------------------------------------------------------------------------*/


/* -------------------------------------------------------------------------------------------------------------
        FUNGSI PENGUBAHAN COLUMN isPublic menjadi false saat anggota terakhir di remove / dihapus
--------------------------------------------------------------------------------------------------------------*/
const updateBoardIsPrivate = async (boardId) => {
  try {
    const memberCount = await BoardMembers.count({
      where: { BoardId: boardId },
    });

    if (memberCount === 0) {
      await Boards.update(
        { isPublic: false },
        { where: { BoardId: boardId } }
      );
      console.log(`Board dengan ID ${boardId} diubah menjadi private.`);
    }
  } catch (error) {
    console.error(`Gagal mengubah status isPublic board: ${error}`);
  }
};
/* -------------------------------------------------------------------------------------------------------------
      FUNGSI PENGUBAHAN COLUMN isPublic menjadi false saat anggota terakhir di remove / dihapus (END)
--------------------------------------------------------------------------------------------------------------*/


/* -------------------------------------------------------------------------------------------------------------
                  FUNGSI UPDATE BOARD - NAMA BOARD TIDAK BOLEH SAMA DENGAN YANG LAIN
--------------------------------------------------------------------------------------------------------------*/
const updateBoard = async (req, res) => {
  try {
    const { userId, boardId, boardName } = req.body;

    // Periksa peran pengguna dalam board
    const userRole = await BoardMembers.findOne({
      where: { UserId: userId, BoardId: boardId },
    });

    if (!userRole || (userRole.role !== 'owner' && userRole.role !== 'admin')) {
      return res.status(403).json({ message: "Anda tidak memiliki izin untuk mengupdate board" });
    }

    // Periksa apakah board dengan nama yang sama sudah ada
    const isBoardExist = await Boards.findOne({
      where: { OwnerId: userId, name: boardName },
    });

    if (isBoardExist) {
      return res.status(400).json({ message: `Mohon maaf, ${boardName} telah ada sebelumnya. Mohon Anda menggantinya dengan yang lain. Terima kasih atas perhatiannya 😊` });
    }

    // Update nama board
    await Boards.update(
      { name: boardName },
      { where: { BoardId: boardId, OwnerId: userId } }
    );

    res.status(200).json({ message: "Nama board berhasil diupdate" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Terjadi kesalahan saat mengupdate board" });
  }
};
/* -------------------------------------------------------------------------------------------------------------
                FUNGSI UPDATE BOARD - NAMA BOARD TIDAK BOLEH SAMA DENGAN YANG LAIN (END)
--------------------------------------------------------------------------------------------------------------*/


/* -------------------------------------------------------------------------------------------------------------
                                  FUNGSI PENAMBAHAN (ADD) USER TO BOARD
--------------------------------------------------------------------------------------------------------------*/
const addUserToBoard = async (req, res) => {
    try {
      const { username, boardId } = req.body;
  
      // Ambil ID pengguna berdasarkan username
      const user = await Users.findOne({
        where: { username: username },
      });
  
      if (!user) {
        return res.status(404).json({ message: "Pengguna tidak ditemukan" });
      }
  
      // Periksa apakah pengguna sudah menjadi anggota board
      const isMember = await BoardMembers.findOne({
        where: { UserId: user.UserId, BoardId: boardId },
      });
  
      if (isMember) {
        return res.status(400).json({ message: "Pengguna sudah menjadi anggota board" });
      }
  
      // Tambahkan pengguna sebagai member ke dalam board
      await BoardMembers.create({
        UserId: user.UserId,
        BoardId: boardId,
        role: 'member',
      });
  
      // Setelah menambahkan anggota, periksa apakah board perlu diubah menjadi public
      await updateBoardIsPublic(boardId);

      res.status(201).json({ message: "Pengguna berhasil ditambahkan ke dalam board" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Terjadi kesalahan saat menambahkan pengguna ke dalam board" });
    }
  };
/* -------------------------------------------------------------------------------------------------------------
                                FUNGSI PENAMBAHAN (ADD) USER TO BOARD (END)
--------------------------------------------------------------------------------------------------------------*/


/* -------------------------------------------------------------------------------------------------------------
                              FUNGSI PENGHAPUSAN (REMOVE) USER DARI BOARD
--------------------------------------------------------------------------------------------------------------*/
const removeUserFromBoard = async (req, res) => {
  try {
    const { userId, boardId, targetUserId } = req.body;

    // Periksa apakah pengguna adalah admin dari board yang dimaksud
    const isAdmin = await BoardMembers.findOne({
      where: { UserId: userId, BoardId: boardId, role: 'admin' },
    });

    if (!isAdmin) {
      return res.status(403).json({ message: "Anda tidak memiliki izin untuk menghapus pengguna dari board" });
    }

    // Hapus pengguna dari board
    const removedUser = await BoardMembers.destroy({
      where: { UserId: targetUserId, BoardId: boardId },
    });

    // Jika pengguna berhasil dihapus, periksa apakah board perlu diubah menjadi private
    if (removedUser) {
      // Hapus semua task yang dibuat oleh pengguna yang dihapus dari board
      await Tasks.destroy({
        where: { UserAssignId: targetUserId, BoardId: boardId },
      });

      // Perbarui status private board jika diperlukan
      await updateBoardIsPrivate(boardId);

      return res.status(200).json({ message: "Pengguna berhasil dihapus dari board bersama dengan semua task yang terkait" });
    } else {
      return res.status(404).json({ message: "Pengguna tidak ditemukan dalam board" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Terjadi kesalahan saat menghapus pengguna dari board" });
  }
};
/* -------------------------------------------------------------------------------------------------------------
                          FUNGSI PENGHAPUSAN (REMOVE) USER DARI BOARD (END)
--------------------------------------------------------------------------------------------------------------*/


/* -------------------------------------------------------------------------------------------------------------
                      FUNGSI DELETE BOARD - HAPUS TASK DAN KEANGGOTAAN BOARD
--------------------------------------------------------------------------------------------------------------*/
const deleteBoard = async (req, res) => {
  try {
    const { userId, boardId } = req.body;

    // Periksa peran pengguna dalam board
    const userRole = await BoardMembers.findOne({
      where: { UserId: userId, BoardId: boardId },
    });

    if (!userRole || (userRole.role !== 'owner' && userRole.role !== 'admin')) {
      return res.status(403).json({ message: "Anda tidak memiliki izin untuk menghapus board" });
    }

    // Hapus seluruh task yang terkait dengan board
    await Tasks.destroy({
      where: { BoardId: boardId },
    });

    // Hapus seluruh keanggotaan board
    await BoardMembers.destroy({
      where: { BoardId: boardId },
    });

    // Hapus board itu sendiri
    await Boards.destroy({
      where: { BoardId: boardId },
    });

    res.status(200).json({ message: "Board berhasil dihapus beserta semua task dan keanggotaannya" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Terjadi kesalahan saat menghapus board" });
  }
};
/* -------------------------------------------------------------------------------------------------------------
                      FUNGSI DELETE BOARD - HAPUS TASK DAN KEANGGOTAAN BOARD (END) 
--------------------------------------------------------------------------------------------------------------*/


module.exports = {
  createBoard,
  updateBoardIsPublic,
  updateBoardIsPrivate,
  addUserToBoard,
  removeUserFromBoard,
  updateBoard,
  deleteBoard,
};
