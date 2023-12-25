const { Users, BoardMembers , Tasks } = require('../database/models');

/* -------------------------------------------------------------------------------------------------------------
                MEMERIKSA APAKAH SEORANG USER TERMASUK ANGGOTA DARI SUATU BOARD
--------------------------------------------------------------------------------------------------------------*/
const isBoardMember = async (userId, boardId) => {
  try {
    const boardMember = await BoardMembers.findOne({
      where: { UserId: userId, BoardId: boardId },
    });

    return !!boardMember; // Mengembalikan nilai true jika pengguna adalah anggota board, dan false jika tidak.
  } catch (error) {
    console.error(error);
    return false;
  }
};
/* -------------------------------------------------------------------------------------------------------------
                MEMERIKSA APAKAH SEORANG USER TERMASUK ANGGOTA DARI SUATU BOARD (END)
--------------------------------------------------------------------------------------------------------------*/


/* -------------------------------------------------------------------------------------------------------------
                MEMBUAT TASK BARU (AVAILABLE SELAMA TERGABUNG DALAM SUATU BOARD)
--------------------------------------------------------------------------------------------------------------*/
const createTask = async (userId, boardId, title, description, status, due_date) => {
  try {
    const isMember = await isBoardMember(userId, boardId);

    if (!isMember) {
      return { success: false, message: "Anda tidak memiliki izin untuk membuat tugas di board ini" };
    }

    const existingTasks = await Tasks.findAll({
      where: { BoardId: boardId, title: title },
    });

    let newTitle = title;

    if (existingTasks.length > 0) {
      const latestVersion = existingTasks.reduce((maxVersion, task) => {
        const match = task.title.match(/\(by user \d+\) versi (\d+)/);
        const taskVersion = match ? parseInt(match[1], 10) : 0;
        return taskVersion > maxVersion ? taskVersion : maxVersion;
      }, 0);

      const version = latestVersion + 1;
      const user = await Users.findOne({
        where: { UserId: userId },
        attributes: ['username'],
      });

      newTitle = `${title} (by ${user.username}) versi ${version}`;
    }

    const userAssign = await Users.findOne({
      where: { UserId: userId },
      attributes: ['UserId'],
    });

    const currentDate = new Date();

    const createdTask = await Tasks.create({
      BoardId: boardId,
      UserId: userId,
      UserAssignId: userAssign.UserId,
      title: newTitle,
      description: description,
      status: status || 'to do',
      due_date: due_date || currentDate,
    });

    // Ambil informasi createdAt dari hasil pembuatan tugas
    const { createdAt } = createdTask;

    // Konversi createdAt ke dalam zona waktu Indonesia/Asia
    const createdAtInUtc = new Date(createdAt).toLocaleString("en-US", { timeZone: "Asia/Jakarta" });

    // Ekstrak tanggal dan waktu dari createdAt
    // Format tanggal sesuai keinginan
    const createdAtDate = new Date(createdAtInUtc).toLocaleDateString('en-GB', { timeZone: 'Asia/Jakarta' }); 
    // Format waktu sesuai keinginan
    const createdAtTime = new Date(createdAtInUtc).toLocaleTimeString('en-GB', { timeZone: 'Asia/Jakarta' });

    // Membuat pesan sukses dengan informasi tanggal dan waktu rinci
    const successMessage = {
      message: "Task berhasil dibuat",
      newTitle: newTitle,
      tanggal: createdAtDate,
      pukul: createdAtTime,
    };

    console.log(successMessage); // Tambahkan ini untuk memastikan hasilnya sudah benar

    return { success: true, ...successMessage };
  } catch (error) {
    console.error(error);
    return { success: false, message: "Terjadi kesalahan saat membuat tugas" };
  }
};
/* -------------------------------------------------------------------------------------------------------------
                MEMBUAT TASK BARU (AVAILABLE SELAMA TERGABUNG DALAM SUATU BOARD) END
--------------------------------------------------------------------------------------------------------------*/


/* -------------------------------------------------------------------------------------------------------------
                    UPDATE TASK (AVAILABLE SELAMA TERGABUNG DALAM SUATU BOARD)
--------------------------------------------------------------------------------------------------------------*/
const updateTask = async (userId, taskId, newTitle, newDescription, newStatus, newDueDate) => {
  try {
    const task = await Tasks.findOne({
      where: { id: taskId },
      include: [
        {
          model: Boards,
          as: 'Board',
          include: [
            {
              model: BoardMembers,
              as: 'Members',
              where: { UserId: userId },
            },
          ],
        },
      ],
    });

    if (!task) {
      return { success: false, message: "Tugas tidak ditemukan atau Anda tidak memiliki izin untuk mengubah tugas ini" };
    }

    // Check if the new title is already in use
    const isTitleExists = await Tasks.findOne({
      where: { title: newTitle, BoardId: task.BoardId },
    });

    if (isTitleExists) {
      return {
        success: false,
        message:
          "Mohon maaf, Anda tidak bisa mengubah judul tugas karena judul tersebut telah digunakan sebelumnya. Silakan gunakan judul lain.",
      };
    }

    // Update task
    task.title = newTitle;
    task.description = newDescription || task.description;
    task.status = newStatus || task.status;
    task.due_date = newDueDate || task.due_date;

    await task.save();

    return { success: true, message: "Tugas berhasil diperbarui" };
  } catch (error) {
    console.error(error);
    return { success: false, message: "Terjadi kesalahan saat memperbarui tugas" };
  }
};
/* -------------------------------------------------------------------------------------------------------------
                    UPDATE TASK (AVAILABLE SELAMA TERGABUNG DALAM SUATU BOARD) (END)
--------------------------------------------------------------------------------------------------------------*/


/* -------------------------------------------------------------------------------------------------------------
                    DELETE TASK (ONLY ADMIN & YANG BERSANGKUTAN SAJA)
--------------------------------------------------------------------------------------------------------------*/
const deleteTask = async (userId, taskId, isAdmin) => {
  try {
    const task = await Tasks.findOne({
      where: { id: taskId },
      include: [
        {
          model: Boards,
          as: 'Board',
          attributes: ['id', 'adminId'],
        },
      ],
    });

    if (!task) {
      return { success: false, message: "Tugas tidak ditemukan" };
    }

    if (!isAdmin) {
      // Jika bukan admin, hanya pemilik task yang dapat menghapusnya
      if (task.UserId !== userId) {
        return { success: false, message: "Anda tidak memiliki izin untuk menghapus tugas ini" };
      }
    }

    await task.destroy();

    return { success: true, message: "Tugas berhasil dihapus" };
  } catch (error) {
    console.error(error);
    return { success: false, message: "Terjadi kesalahan saat menghapus tugas" };
  }
};
/* -------------------------------------------------------------------------------------------------------------
                    DELETE TASK (ONLY ADMIN & YANG BERSANGKUTAN SAJA) (END)
--------------------------------------------------------------------------------------------------------------*/
  module.exports = {
    isBoardMember,
    createTask,
  };
  