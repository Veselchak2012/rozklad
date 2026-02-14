const state = {
  rooms: [],
  teachers: [],
  subjects: [],
  dayLabels: ["Понеділок", "Вівторок", "Середа", "Четвер", "П'ятниця"],
  lessonCount: 7,
};

const el = {
  roomForm: document.getElementById("room-form"),
  roomInput: document.getElementById("room-input"),
  roomList: document.getElementById("room-list"),
  teacherForm: document.getElementById("teacher-form"),
  teacherInput: document.getElementById("teacher-input"),
  teacherList: document.getElementById("teacher-list"),
  subjectForm: document.getElementById("subject-form"),
  subjectName: document.getElementById("subject-name"),
  subjectTeacher: document.getElementById("subject-teacher"),
  subjectLessons: document.getElementById("subject-lessons"),
  subjectList: document.getElementById("subject-list"),
  scheduleTable: document.getElementById("schedule-table"),
  tilePool: document.getElementById("tile-pool"),
  autoBtn: document.getElementById("auto-btn"),
  clearBtn: document.getElementById("clear-btn"),
  exportXlsx: document.getElementById("export-xlsx"),
  exportCsv: document.getElementById("export-csv"),
};

function uid() {
  return Math.random().toString(36).slice(2, 11);
}

function createScheduleGrid() {
  const table = el.scheduleTable;
  table.innerHTML = "";

  const header = document.createElement("tr");
  header.innerHTML = `<th>Урок</th>${state.dayLabels.map((d) => `<th>${d}</th>`).join("")}`;
  table.appendChild(header);

  for (let lesson = 1; lesson <= state.lessonCount; lesson += 1) {
    const row = document.createElement("tr");
    row.innerHTML = `<th>${lesson}</th>`;

    state.dayLabels.forEach((_, dayIdx) => {
      const td = document.createElement("td");
      const slot = document.createElement("div");
      slot.className = "slot dropzone";
      slot.dataset.day = String(dayIdx);
      slot.dataset.lesson = String(lesson - 1);
      td.appendChild(slot);
      row.appendChild(td);
    });

    table.appendChild(row);
  }

  setDropzoneEvents();
}

function refreshTeacherOptions() {
  el.subjectTeacher.innerHTML = "";
  if (!state.teachers.length) {
    const op = document.createElement("option");
    op.value = "";
    op.textContent = "Спочатку додайте вчителя";
    el.subjectTeacher.appendChild(op);
    el.subjectTeacher.disabled = true;
    return;
  }

  el.subjectTeacher.disabled = false;
  state.teachers.forEach((teacher) => {
    const op = document.createElement("option");
    op.value = teacher.id;
    op.textContent = teacher.name;
    el.subjectTeacher.appendChild(op);
  });
}

function renderSimpleList(container, data, removeHandler) {
  container.innerHTML = "";
  data.forEach((item) => {
    const li = document.createElement("li");
    li.textContent = item.label;
    const btn = document.createElement("button");
    btn.textContent = "✕";
    btn.className = "delete";
    btn.type = "button";
    btn.onclick = () => removeHandler(item.id);
    li.appendChild(btn);
    container.appendChild(li);
  });
}

function renderRooms() {
  renderSimpleList(
    el.roomList,
    state.rooms.map((r) => ({ id: r.id, label: r.name })),
    (id) => {
      state.rooms = state.rooms.filter((r) => r.id !== id);
      renderRooms();
      renderAllTiles();
    },
  );
}

function renderTeachers() {
  renderSimpleList(
    el.teacherList,
    state.teachers.map((t) => ({ id: t.id, label: t.name })),
    (id) => {
      state.teachers = state.teachers.filter((t) => t.id !== id);
      state.subjects = state.subjects.filter((s) => s.teacherId !== id);
      renderTeachers();
      refreshTeacherOptions();
      renderSubjects();
      renderAllTiles();
    },
  );
}

function renderSubjects() {
  el.subjectList.innerHTML = "";
  state.subjects.forEach((subject) => {
    const teacher = state.teachers.find((t) => t.id === subject.teacherId);
    const li = document.createElement("li");
    li.innerHTML = `${subject.name} — ${teacher ? teacher.name : "(без вчителя)"} · ${subject.lessonsPerWeek} год/тиж.`;
    const btn = document.createElement("button");
    btn.className = "delete";
    btn.type = "button";
    btn.textContent = "✕";
    btn.onclick = () => {
      state.subjects = state.subjects.filter((s) => s.id !== subject.id);
      renderSubjects();
      renderAllTiles();
    };
    li.appendChild(btn);
    el.subjectList.appendChild(li);
  });
}

function makeTile(subject, roomId = null) {
  const teacher = state.teachers.find((t) => t.id === subject.teacherId);
  const room = state.rooms.find((r) => r.id === roomId);
  const tile = document.createElement("div");
  tile.className = "tile";
  tile.draggable = true;
  tile.dataset.subjectId = subject.id;
  tile.dataset.roomId = roomId || "";
  tile.innerHTML = `<strong>${subject.name}</strong><small>${teacher ? teacher.name : "Невідомий вчитель"}</small><small>Кабінет: ${room ? room.name : "не призначено"}</small>`;

  tile.addEventListener("dragstart", () => {
    tile.classList.add("dragging");
  });
  tile.addEventListener("dragend", () => tile.classList.remove("dragging"));

  return tile;
}

function clearBoard() {
  document.querySelectorAll(".slot").forEach((slot) => {
    slot.innerHTML = "";
  });
  el.tilePool.innerHTML = "";
}

function renderAllTiles() {
  clearBoard();
  state.subjects.forEach((subject) => {
    for (let i = 0; i < subject.lessonsPerWeek; i += 1) {
      el.tilePool.appendChild(makeTile(subject));
    }
  });
}

function autoSchedule() {
  if (!state.rooms.length || !state.subjects.length || !state.teachers.length) {
    alert("Потрібно додати кабінети, вчителів і предмети перед автозаповненням.");
    return;
  }

  renderAllTiles();
  const slots = Array.from(document.querySelectorAll(".slot"));
  const poolTiles = Array.from(el.tilePool.querySelectorAll(".tile"));
  const randomizedSlots = slots.sort(() => Math.random() - 0.5);

  poolTiles.forEach((tile, index) => {
    const slot = randomizedSlots[index];
    if (!slot) return;

    const randomRoom = state.rooms[Math.floor(Math.random() * state.rooms.length)];
    const subject = state.subjects.find((s) => s.id === tile.dataset.subjectId);
    if (!subject) return;

    slot.appendChild(makeTile(subject, randomRoom.id));
    tile.remove();
  });
}

function setDropzoneEvents() {
  const dropzones = document.querySelectorAll(".dropzone");
  dropzones.forEach((zone) => {
    zone.addEventListener("dragover", (e) => {
      e.preventDefault();
      zone.classList.add("drag-over");
    });
    zone.addEventListener("dragleave", () => zone.classList.remove("drag-over"));
    zone.addEventListener("drop", (e) => {
      e.preventDefault();
      zone.classList.remove("drag-over");
      const dragging = document.querySelector(".tile.dragging");
      if (!dragging) return;

      const subject = state.subjects.find((s) => s.id === dragging.dataset.subjectId);
      if (subject && zone !== el.tilePool && !dragging.dataset.roomId && state.rooms.length) {
        const randomRoom = state.rooms[Math.floor(Math.random() * state.rooms.length)];
        dragging.dataset.roomId = randomRoom.id;
        dragging.querySelector("small:last-child").textContent = `Кабінет: ${randomRoom.name}`;
      }

      zone.appendChild(dragging);
    });
  });
}

function collectScheduleMatrix() {
  const matrix = [["Урок", ...state.dayLabels]];
  for (let lesson = 0; lesson < state.lessonCount; lesson += 1) {
    const row = [String(lesson + 1)];
    for (let day = 0; day < state.dayLabels.length; day += 1) {
      const slot = document.querySelector(`.slot[data-day="${day}"][data-lesson="${lesson}"]`);
      const texts = Array.from(slot?.querySelectorAll(".tile") || []).map((tile) => tile.innerText.replace(/\n/g, " | "));
      row.push(texts.join("\n"));
    }
    matrix.push(row);
  }
  return matrix;
}

function exportXlsx() {
  const matrix = collectScheduleMatrix();
  const ws = XLSX.utils.aoa_to_sheet(matrix);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Розклад");
  XLSX.writeFile(wb, "rozklad_licei.xlsx");
}

function exportCsv() {
  const matrix = collectScheduleMatrix();
  const csv = matrix
    .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","))
    .join("\n");

  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "rozklad_licei_google_sheets.csv";
  link.click();
  URL.revokeObjectURL(link.href);
}

el.roomForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const name = el.roomInput.value.trim();
  if (!name) return;
  state.rooms.push({ id: uid(), name });
  el.roomInput.value = "";
  renderRooms();
});

el.teacherForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const name = el.teacherInput.value.trim();
  if (!name) return;
  state.teachers.push({ id: uid(), name });
  el.teacherInput.value = "";
  renderTeachers();
  refreshTeacherOptions();
});

el.subjectForm.addEventListener("submit", (e) => {
  e.preventDefault();
  if (!el.subjectTeacher.value) {
    alert("Оберіть вчителя для предмета.");
    return;
  }

  state.subjects.push({
    id: uid(),
    name: el.subjectName.value.trim(),
    teacherId: el.subjectTeacher.value,
    lessonsPerWeek: Number(el.subjectLessons.value),
  });

  el.subjectName.value = "";
  el.subjectLessons.value = "2";
  renderSubjects();
  renderAllTiles();
});

el.autoBtn.addEventListener("click", autoSchedule);
el.clearBtn.addEventListener("click", renderAllTiles);
el.exportXlsx.addEventListener("click", exportXlsx);
el.exportCsv.addEventListener("click", exportCsv);

createScheduleGrid();
refreshTeacherOptions();
