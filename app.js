const state = {
  classes: [],
  students: [],
  rooms: [],
  teachers: [],
  subjects: [],
  scheduleEntries: [],
  dayLabels: ["Понеділок", "Вівторок", "Середа", "Четвер", "П'ятниця"],
  lessonCount: 7,
  viewMode: "global",
  viewTarget: "",
};

const el = {
  importForm: document.getElementById("import-form"),
  importType: document.getElementById("import-type"),
  importFile: document.getElementById("import-file"),
  classForm: document.getElementById("class-form"),
  classInput: document.getElementById("class-input"),
  classList: document.getElementById("class-list"),
  roomForm: document.getElementById("room-form"),
  roomInput: document.getElementById("room-input"),
  roomList: document.getElementById("room-list"),
  teacherForm: document.getElementById("teacher-form"),
  teacherInput: document.getElementById("teacher-input"),
  teacherList: document.getElementById("teacher-list"),
  subjectForm: document.getElementById("subject-form"),
  subjectName: document.getElementById("subject-name"),
  subjectTeacher: document.getElementById("subject-teacher"),
  subjectClass: document.getElementById("subject-class"),
  subjectLessons: document.getElementById("subject-lessons"),
  subjectList: document.getElementById("subject-list"),
  scheduleTable: document.getElementById("schedule-table"),
  tilePool: document.getElementById("tile-pool"),
  poolTitle: document.getElementById("pool-title"),
  autoBtn: document.getElementById("auto-btn"),
  clearBtn: document.getElementById("clear-btn"),
  exportXlsx: document.getElementById("export-xlsx"),
  exportCsv: document.getElementById("export-csv"),
  viewMode: document.getElementById("view-mode"),
  viewTarget: document.getElementById("view-target"),
};

function uid() {
  return Math.random().toString(36).slice(2, 11);
}

function uniqPushByName(list, name, extra = {}) {
  if (!name) return null;
  const normalized = name.trim();
  if (!normalized) return null;
  const found = list.find((item) => item.name.toLowerCase() === normalized.toLowerCase());
  if (found) return found;
  const created = { id: uid(), name: normalized, ...extra };
  list.push(created);
  return created;
}

function parseFlatText(content) {
  return content
    .split(/\r?\n|,|;/)
    .map((x) => x.trim())
    .filter(Boolean);
}

function parseRowsFromFile(file) {
  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  if (ext === "xlsx") {
    return file.arrayBuffer().then((buffer) => {
      const wb = XLSX.read(buffer, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      return XLSX.utils.sheet_to_json(ws, { header: 1, raw: false });
    });
  }

  return file.text().then((text) => {
    if (ext === "csv") {
      return text.split(/\r?\n/).map((line) => line.split(",").map((c) => c.trim()));
    }
    return parseFlatText(text).map((name) => [name]);
  });
}

function createLessonGrid() {
  el.scheduleTable.innerHTML = "";
  const header = document.createElement("tr");
  header.innerHTML = `<th>Урок</th>${state.dayLabels.map((d) => `<th>${d}</th>`).join("")}`;
  el.scheduleTable.appendChild(header);

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
    el.scheduleTable.appendChild(row);
  }

  bindDropzones();
}

function buildTeacherWeekTable(teacherIds) {
  el.scheduleTable.innerHTML = "";
  const header = document.createElement("tr");
  header.innerHTML = `<th>Вчитель</th>${state.dayLabels.map((d) => `<th>${d}</th>`).join("")}`;
  el.scheduleTable.appendChild(header);

  teacherIds.forEach((teacherId) => {
    const teacher = state.teachers.find((t) => t.id === teacherId);
    if (!teacher) return;

    const row = document.createElement("tr");
    const first = document.createElement("th");
    first.textContent = teacher.name;
    row.appendChild(first);

    state.dayLabels.forEach((_, dayIdx) => {
      const td = document.createElement("td");
      const list = state.scheduleEntries
        .filter((entry) => entry.day === dayIdx)
        .map((entry) => ({ entry, subject: state.subjects.find((s) => s.id === entry.subjectId) }))
        .filter((x) => x.subject && x.subject.teacherId === teacherId)
        .sort((a, b) => a.entry.lesson - b.entry.lesson);

      if (!list.length) {
        td.textContent = "—";
      } else {
        td.innerHTML = list
          .map((x) => {
            const cls = state.classes.find((c) => c.id === x.subject.classId)?.name || "-";
            const room = state.rooms.find((r) => r.id === x.entry.roomId)?.name || "-";
            return `<div class="week-item"><strong>${x.entry.lesson + 1}.</strong> ${x.subject.name} (${cls}, каб.${room})</div>`;
          })
          .join("");
      }
      row.appendChild(td);
    });

    el.scheduleTable.appendChild(row);
  });
}

function buildClassWeekTable(classIds) {
  el.scheduleTable.innerHTML = "";
  const header = document.createElement("tr");
  header.innerHTML = `<th>Клас</th>${state.dayLabels.map((d) => `<th>${d}</th>`).join("")}`;
  el.scheduleTable.appendChild(header);

  classIds.forEach((classId) => {
    const cls = state.classes.find((c) => c.id === classId);
    if (!cls) return;

    const row = document.createElement("tr");
    const first = document.createElement("th");
    first.textContent = cls.name;
    row.appendChild(first);

    state.dayLabels.forEach((_, dayIdx) => {
      const td = document.createElement("td");
      const list = state.scheduleEntries
        .filter((entry) => entry.day === dayIdx)
        .map((entry) => ({ entry, subject: state.subjects.find((s) => s.id === entry.subjectId) }))
        .filter((x) => x.subject && x.subject.classId === classId)
        .sort((a, b) => a.entry.lesson - b.entry.lesson);

      if (!list.length) {
        td.textContent = "—";
      } else {
        td.innerHTML = list
          .map((x) => {
            const teacher = state.teachers.find((t) => t.id === x.subject.teacherId)?.name || "-";
            const room = state.rooms.find((r) => r.id === x.entry.roomId)?.name || "-";
            return `<div class="week-item"><strong>${x.entry.lesson + 1}.</strong> ${x.subject.name} (${teacher}, каб.${room})</div>`;
          })
          .join("");
      }
      row.appendChild(td);
    });

    el.scheduleTable.appendChild(row);
  });
}

function refreshSelectors() {
  const fill = (select, list, placeholder) => {
    const current = select.value;
    select.innerHTML = "";
    if (!list.length) {
      const op = document.createElement("option");
      op.value = "";
      op.textContent = placeholder;
      select.appendChild(op);
      select.disabled = true;
      return;
    }
    select.disabled = false;
    list.forEach((item) => {
      const op = document.createElement("option");
      op.value = item.id;
      op.textContent = item.name;
      select.appendChild(op);
    });
    if (list.some((x) => x.id === current)) select.value = current;
  };

  fill(el.subjectTeacher, state.teachers, "Спочатку додайте вчителя");
  fill(el.subjectClass, state.classes, "Спочатку додайте клас");

  el.viewTarget.innerHTML = "";
  if (state.viewMode === "class") {
    fill(el.viewTarget, state.classes, "Немає класів");
  } else if (state.viewMode === "teacher" || state.viewMode === "teacher-week") {
    fill(el.viewTarget, state.teachers, "Немає вчителів");
  } else if (state.viewMode === "class-week") {
    fill(el.viewTarget, state.classes, "Немає класів");
  } else {
    const op = document.createElement("option");
    op.value = "all";
    op.textContent = "Всі";
    el.viewTarget.appendChild(op);
    el.viewTarget.disabled = true;
  }

  state.viewTarget = el.viewTarget.value || "";
}

function renderSimpleList(container, items, onDelete, format = (x) => x.name) {
  container.innerHTML = "";
  items.forEach((item) => {
    const li = document.createElement("li");
    li.textContent = format(item);
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "delete";
    btn.textContent = "✕";
    btn.onclick = () => onDelete(item.id);
    li.appendChild(btn);
    container.appendChild(li);
  });
}

function renderAllLists() {
  renderSimpleList(el.classList, state.classes, (id) => {
    state.classes = state.classes.filter((x) => x.id !== id);
    state.students = state.students.filter((x) => x.classId !== id);
    state.subjects = state.subjects.filter((x) => x.classId !== id);
    syncEntriesFromSubjects();
    renderAll();
  });

  renderSimpleList(el.roomList, state.rooms, (id) => {
    state.rooms = state.rooms.filter((x) => x.id !== id);
    state.scheduleEntries.forEach((entry) => {
      if (entry.roomId === id) entry.roomId = "";
    });
    renderSchedule();
    renderAllLists();
  });

  el.teacherList.innerHTML = "";
  state.teachers.forEach((teacher) => {
    const li = document.createElement("li");
    li.textContent = `${teacher.name} (${teacher.allowedSubjects.join(", ") || "предмети не вказані"})`;

    const actions = document.createElement("div");
    actions.className = "item-actions";

    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.className = "ghost compact";
    editBtn.textContent = "Предмети";
    editBtn.onclick = () => {
      const value = prompt(`Предмети для ${teacher.name} (через кому):`, teacher.allowedSubjects.join(", "));
      if (value === null) return;
      teacher.allowedSubjects = value.split(",").map((x) => x.trim()).filter(Boolean);
      renderAllLists();
    };

    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.className = "delete";
    delBtn.textContent = "✕";
    delBtn.onclick = () => {
      state.teachers = state.teachers.filter((x) => x.id !== teacher.id);
      state.subjects = state.subjects.filter((x) => x.teacherId !== teacher.id);
      syncEntriesFromSubjects();
      renderAll();
    };

    actions.appendChild(editBtn);
    actions.appendChild(delBtn);
    li.appendChild(actions);
    el.teacherList.appendChild(li);
  });

  renderSimpleList(
    el.subjectList,
    state.subjects,
    (id) => {
      state.subjects = state.subjects.filter((x) => x.id !== id);
      syncEntriesFromSubjects();
      renderAll();
    },
    (subject) => {
      const teacher = state.teachers.find((x) => x.id === subject.teacherId)?.name || "-";
      const cls = state.classes.find((x) => x.id === subject.classId)?.name || "-";
      return `${subject.name} — ${teacher} · ${cls} · ${subject.lessonsPerWeek} год/тиж.`;
    },
  );
}

function syncEntriesFromSubjects() {
  const bySubject = new Map();
  state.scheduleEntries.forEach((entry) => {
    if (!bySubject.has(entry.subjectId)) bySubject.set(entry.subjectId, []);
    bySubject.get(entry.subjectId).push(entry);
  });

  const newEntries = [];
  state.subjects.forEach((subject) => {
    const existing = bySubject.get(subject.id) || [];
    for (let i = 0; i < subject.lessonsPerWeek; i += 1) {
      const old = existing[i];
      newEntries.push(old || { id: uid(), subjectId: subject.id, day: null, lesson: null, roomId: "" });
    }
  });
  state.scheduleEntries = newEntries;
}

function matchesView(entry, subject) {
  if (state.viewMode === "class") return subject.classId === state.viewTarget;
  if (state.viewMode === "teacher") return subject.teacherId === state.viewTarget;
  return true;
}

function conflicts(entry, day, lesson, roomId) {
  const subject = state.subjects.find((s) => s.id === entry.subjectId);
  if (!subject) return true;

  return state.scheduleEntries.some((other) => {
    if (other.id === entry.id || other.day !== day || other.lesson !== lesson) return false;
    const otherSubj = state.subjects.find((s) => s.id === other.subjectId);
    if (!otherSubj) return false;
    return (
      otherSubj.classId === subject.classId
      || otherSubj.teacherId === subject.teacherId
      || (roomId && other.roomId && other.roomId === roomId)
    );
  });
}

function autoSchedule() {
  if (!state.classes.length || !state.rooms.length || !state.teachers.length || !state.subjects.length) {
    alert("Додайте класи, кабінети, вчителів і предмети перед автозаповненням.");
    return;
  }

  const unplaced = state.scheduleEntries.filter((entry) => entry.day === null || entry.lesson === null);
  unplaced.forEach((entry) => {
    let placed = false;
    for (let day = 0; day < state.dayLabels.length && !placed; day += 1) {
      for (let lesson = 0; lesson < state.lessonCount && !placed; lesson += 1) {
        const randomRoom = state.rooms[Math.floor(Math.random() * state.rooms.length)];
        if (!conflicts(entry, day, lesson, randomRoom.id)) {
          entry.day = day;
          entry.lesson = lesson;
          entry.roomId = randomRoom.id;
          placed = true;
        }
      }
    }
  });

  renderSchedule();
}

function makeTile(entry) {
  const subject = state.subjects.find((s) => s.id === entry.subjectId);
  if (!subject) return null;
  const teacher = state.teachers.find((t) => t.id === subject.teacherId)?.name || "-";
  const cls = state.classes.find((c) => c.id === subject.classId)?.name || "-";
  const room = state.rooms.find((r) => r.id === entry.roomId)?.name || "не призначено";

  const tile = document.createElement("div");
  tile.className = "tile";
  tile.draggable = true;
  tile.dataset.entryId = entry.id;
  tile.innerHTML = `<strong>${subject.name}</strong><small>${teacher}</small><small>Клас: ${cls}</small><small>Кабінет: ${room}</small>`;
  tile.addEventListener("dragstart", () => tile.classList.add("dragging"));
  tile.addEventListener("dragend", () => tile.classList.remove("dragging"));
  return tile;
}

function renderLessonSchedule() {
  createLessonGrid();
  document.querySelectorAll(".slot").forEach((slot) => (slot.innerHTML = ""));
  el.tilePool.innerHTML = "";

  state.scheduleEntries.forEach((entry) => {
    const subject = state.subjects.find((s) => s.id === entry.subjectId);
    if (!subject || !matchesView(entry, subject)) return;

    const tile = makeTile(entry);
    if (!tile) return;
    if (entry.day === null || entry.lesson === null) {
      el.tilePool.appendChild(tile);
      return;
    }

    const slot = document.querySelector(`.slot[data-day="${entry.day}"][data-lesson="${entry.lesson}"]`);
    if (slot) slot.appendChild(tile);
  });
}

function renderSchedule() {
  if (state.viewMode === "teachers-week-all") {
    buildTeacherWeekTable(state.teachers.map((t) => t.id));
    el.tilePool.style.display = "none";
    el.poolTitle.style.display = "none";
    return;
  }

  if (state.viewMode === "teacher-week") {
    const id = state.viewTarget;
    buildTeacherWeekTable(id ? [id] : []);
    el.tilePool.style.display = "none";
    el.poolTitle.style.display = "none";
    return;
  }

  if (state.viewMode === "class-week") {
    const id = state.viewTarget;
    buildClassWeekTable(id ? [id] : []);
    el.tilePool.style.display = "none";
    el.poolTitle.style.display = "none";
    return;
  }

  el.tilePool.style.display = "block";
  el.poolTitle.style.display = "block";
  renderLessonSchedule();
}

function bindDropzones() {
  document.querySelectorAll(".dropzone").forEach((zone) => {
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
      const entry = state.scheduleEntries.find((x) => x.id === dragging.dataset.entryId);
      if (!entry) return;

      if (zone.dataset.pool === "1") {
        entry.day = null;
        entry.lesson = null;
        entry.roomId = "";
        renderSchedule();
        return;
      }

      const day = Number(zone.dataset.day);
      const lesson = Number(zone.dataset.lesson);
      const currentRoom = entry.roomId || state.rooms[0]?.id || "";
      if (conflicts(entry, day, lesson, currentRoom)) {
        alert("Конфлікт: клас/вчитель/кабінет вже зайнятий у цей час.");
        return;
      }

      entry.day = day;
      entry.lesson = lesson;
      if (!entry.roomId && state.rooms.length) {
        entry.roomId = state.rooms[Math.floor(Math.random() * state.rooms.length)].id;
      }
      renderSchedule();
    });
  });
}

function collectScheduleMatrix() {
  if (state.viewMode === "teachers-week-all" || state.viewMode === "teacher-week") {
    const matrix = [["Вчитель", ...state.dayLabels]];
    const ids = state.viewMode === "teacher-week" ? (state.viewTarget ? [state.viewTarget] : []) : state.teachers.map((t) => t.id);

    ids.forEach((teacherId) => {
      const teacher = state.teachers.find((t) => t.id === teacherId);
      if (!teacher) return;
      const row = [teacher.name];
      state.dayLabels.forEach((_, dayIdx) => {
        const text = state.scheduleEntries
          .filter((e) => e.day === dayIdx)
          .map((e) => ({ e, s: state.subjects.find((s) => s.id === e.subjectId) }))
          .filter((x) => x.s && x.s.teacherId === teacherId)
          .sort((a, b) => a.e.lesson - b.e.lesson)
          .map((x) => {
            const cls = state.classes.find((c) => c.id === x.s.classId)?.name || "-";
            const room = state.rooms.find((r) => r.id === x.e.roomId)?.name || "-";
            return `${x.e.lesson + 1}. ${x.s.name} (${cls}, каб.${room})`;
          })
          .join("\n");
        row.push(text);
      });
      matrix.push(row);
    });
    return matrix;
  }

  if (state.viewMode === "class-week") {
    const matrix = [["Клас", ...state.dayLabels]];
    const ids = state.viewTarget ? [state.viewTarget] : [];

    ids.forEach((classId) => {
      const cls = state.classes.find((c) => c.id === classId);
      if (!cls) return;
      const row = [cls.name];
      state.dayLabels.forEach((_, dayIdx) => {
        const text = state.scheduleEntries
          .filter((e) => e.day === dayIdx)
          .map((e) => ({ e, s: state.subjects.find((s) => s.id === e.subjectId) }))
          .filter((x) => x.s && x.s.classId === classId)
          .sort((a, b) => a.e.lesson - b.e.lesson)
          .map((x) => {
            const teacher = state.teachers.find((t) => t.id === x.s.teacherId)?.name || "-";
            const room = state.rooms.find((r) => r.id === x.e.roomId)?.name || "-";
            return `${x.e.lesson + 1}. ${x.s.name} (${teacher}, каб.${room})`;
          })
          .join("\n");
        row.push(text);
      });
      matrix.push(row);
    });
    return matrix;
  }

  const matrix = [["Урок", ...state.dayLabels]];
  for (let lesson = 0; lesson < state.lessonCount; lesson += 1) {
    const row = [String(lesson + 1)];
    for (let day = 0; day < state.dayLabels.length; day += 1) {
      const items = state.scheduleEntries
        .filter((e) => e.day === day && e.lesson === lesson)
        .map((e) => ({ e, s: state.subjects.find((s) => s.id === e.subjectId) }))
        .filter((x) => x.s && matchesView(x.e, x.s))
        .map((x) => {
          const teacher = state.teachers.find((t) => t.id === x.s.teacherId)?.name || "-";
          const cls = state.classes.find((c) => c.id === x.s.classId)?.name || "-";
          const room = state.rooms.find((r) => r.id === x.e.roomId)?.name || "-";
          return `${x.s.name} | ${teacher} | ${cls} | каб.${room}`;
        });
      row.push(items.join("\n"));
    }
    matrix.push(row);
  }
  return matrix;
}

function exportXlsx() {
  const ws = XLSX.utils.aoa_to_sheet(collectScheduleMatrix());
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Розклад");
  XLSX.writeFile(wb, "rozklad_licei.xlsx");
}

function exportCsv() {
  const csv = collectScheduleMatrix()
    .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","))
    .join("\n");
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "rozklad_licei_google_sheets.csv";
  link.click();
  URL.revokeObjectURL(link.href);
}

function clearPlacements() {
  state.scheduleEntries.forEach((entry) => {
    entry.day = null;
    entry.lesson = null;
    entry.roomId = "";
  });
  renderSchedule();
}

function renderAll() {
  refreshSelectors();
  renderAllLists();
  renderSchedule();
}

el.importForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const file = el.importFile.files?.[0];
  if (!file) return;

  const rows = await parseRowsFromFile(file);
  const type = el.importType.value;
  let added = 0;

  if (type === "classes") {
    rows.forEach((row) => {
      if (uniqPushByName(state.classes, String(row[0] || ""))) added += 1;
    });
  }

  if (type === "rooms") {
    rows.forEach((row) => {
      if (uniqPushByName(state.rooms, String(row[0] || ""))) added += 1;
    });
  }

  if (type === "teachers") {
    rows.forEach((row) => {
      const name = String(row[0] || "").trim();
      if (!name) return;
      const teacher = uniqPushByName(state.teachers, name, { allowedSubjects: [] });
      if (teacher && !teacher.allowedSubjects) teacher.allowedSubjects = [];
      const subjectsCell = String(row[1] || "").trim();
      if (subjectsCell && teacher) {
        teacher.allowedSubjects = subjectsCell.split(/[;,]/).map((x) => x.trim()).filter(Boolean);
      }
      if (teacher) added += 1;
    });
  }

  if (type === "students") {
    rows.forEach((row) => {
      const name = String(row[0] || "").trim();
      const className = String(row[1] || "").trim();
      if (!name) return;
      const cls = className ? uniqPushByName(state.classes, className) : null;
      const classId = cls?.id || "";
      if (!state.students.some((s) => s.name.toLowerCase() === name.toLowerCase() && s.classId === classId)) {
        state.students.push({ id: uid(), name, classId });
        added += 1;
      }
    });
  }

  el.importFile.value = "";
  renderAll();
  alert(`Імпорт завершено. Додано: ${added}`);
});

el.classForm.addEventListener("submit", (e) => {
  e.preventDefault();
  if (uniqPushByName(state.classes, el.classInput.value)) {
    el.classInput.value = "";
    renderAll();
  }
});

el.roomForm.addEventListener("submit", (e) => {
  e.preventDefault();
  if (uniqPushByName(state.rooms, el.roomInput.value)) {
    el.roomInput.value = "";
    renderAll();
  }
});

el.teacherForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const created = uniqPushByName(state.teachers, el.teacherInput.value, { allowedSubjects: [] });
  if (created) {
    if (!created.allowedSubjects) created.allowedSubjects = [];
    el.teacherInput.value = "";
    renderAll();
  }
});

el.subjectForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const name = el.subjectName.value.trim();
  const teacherId = el.subjectTeacher.value;
  const classId = el.subjectClass.value;
  const lessons = Number(el.subjectLessons.value);
  if (!name || !teacherId || !classId || !lessons) return;

  const teacher = state.teachers.find((t) => t.id === teacherId);
  if (!teacher) return;
  const ok = teacher.allowedSubjects.length === 0 || teacher.allowedSubjects.some((s) => s.toLowerCase() === name.toLowerCase());
  if (!ok) {
    alert("Цей вчитель не має такого предмета у переліку.");
    return;
  }

  state.subjects.push({ id: uid(), name, teacherId, classId, lessonsPerWeek: lessons });
  syncEntriesFromSubjects();
  el.subjectName.value = "";
  el.subjectLessons.value = "2";
  renderAll();
});

el.viewMode.addEventListener("change", () => {
  state.viewMode = el.viewMode.value;
  refreshSelectors();
  state.viewTarget = el.viewTarget.value;
  renderSchedule();
});

el.viewTarget.addEventListener("change", () => {
  state.viewTarget = el.viewTarget.value;
  renderSchedule();
});

el.autoBtn.addEventListener("click", autoSchedule);
el.clearBtn.addEventListener("click", clearPlacements);
el.exportXlsx.addEventListener("click", exportXlsx);
el.exportCsv.addEventListener("click", exportCsv);

refreshSelectors();
renderAllLists();
renderSchedule();
