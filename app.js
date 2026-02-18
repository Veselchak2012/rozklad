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
  subjectTeacher2: document.getElementById("subject-teacher-2"),
  subjectClass: document.getElementById("subject-class"),
  subjectLessons: document.getElementById("subject-lessons"),
  groupMode: document.getElementById("group-mode"),
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

const uid = () => Math.random().toString(36).slice(2, 11);

function uniqPushByName(list, name, extra = {}) {
  const normalized = String(name || "").trim();
  if (!normalized) return null;
  const found = list.find((item) => item.name.toLowerCase() === normalized.toLowerCase());
  if (found) return found;
  const created = { id: uid(), name: normalized, ...extra };
  list.push(created);
  return created;
}

function parseFlatText(content) {
  return content.split(/\r?\n|,|;/).map((x) => x.trim()).filter(Boolean);
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
    if (ext === "csv") return text.split(/\r?\n/).map((line) => line.split(",").map((c) => c.trim()));
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

function buildWeekTable(ids, type) {
  el.scheduleTable.innerHTML = "";
  const firstLabel = type === "teacher" ? "Вчитель" : "Клас";
  const header = document.createElement("tr");
  header.innerHTML = `<th>${firstLabel}</th>${state.dayLabels.map((d) => `<th>${d}</th>`).join("")}`;
  el.scheduleTable.appendChild(header);

  ids.forEach((id) => {
    const entity = type === "teacher" ? state.teachers.find((x) => x.id === id) : state.classes.find((x) => x.id === id);
    if (!entity) return;
    const row = document.createElement("tr");
    const first = document.createElement("th");
    first.textContent = entity.name;
    row.appendChild(first);

    state.dayLabels.forEach((_, dayIdx) => {
      const td = document.createElement("td");
      const lessons = state.scheduleEntries
        .filter((e) => e.day === dayIdx)
        .map((e) => ({ e, s: state.subjects.find((s) => s.id === e.subjectId) }))
        .filter((x) => x.s && (type === "teacher" ? x.s.teacherId === id : x.s.classId === id))
        .sort((a, b) => a.e.lesson - b.e.lesson);

      td.innerHTML = lessons.length
        ? lessons.map((x) => {
            const teacher = state.teachers.find((t) => t.id === x.s.teacherId)?.name || "-";
            const cls = state.classes.find((c) => c.id === x.s.classId)?.name || "-";
            const room = state.rooms.find((r) => r.id === x.e.roomId)?.name || "-";
            const who = type === "teacher" ? cls : teacher;
            return `<div class="week-item"><strong>${x.e.lesson + 1}.</strong> ${x.s.name} (${who}, каб.${room})</div>`;
          }).join("")
        : "—";
      row.appendChild(td);
    });

    el.scheduleTable.appendChild(row);
  });
}

function fillSelect(select, list, placeholder) {
  const current = select.value;
  select.innerHTML = "";
  if (!list.length) {
    select.disabled = true;
    const op = document.createElement("option");
    op.value = "";
    op.textContent = placeholder;
    select.appendChild(op);
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
}

function refreshSelectors() {
  fillSelect(el.subjectTeacher, state.teachers, "Спочатку додайте вчителя");
  fillSelect(el.subjectTeacher2, state.teachers, "Другий вчитель");
  fillSelect(el.subjectClass, state.classes, "Спочатку додайте клас");

  if (el.groupMode.value === "none") {
    el.subjectTeacher2.classList.add("hidden");
  } else {
    el.subjectTeacher2.classList.remove("hidden");
  }

  el.viewTarget.innerHTML = "";
  if (state.viewMode === "class" || state.viewMode === "class-week") {
    fillSelect(el.viewTarget, state.classes, "Немає класів");
  } else if (state.viewMode === "teacher" || state.viewMode === "teacher-week") {
    fillSelect(el.viewTarget, state.teachers, "Немає вчителів");
  } else {
    el.viewTarget.disabled = true;
    const op = document.createElement("option");
    op.value = "all";
    op.textContent = "Всі";
    el.viewTarget.appendChild(op);
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
      const subject = state.subjects.find((s) => s.id === id);
      state.subjects = state.subjects.filter((x) => x.id !== id && (!subject?.groupPairId || x.groupPairId !== subject.groupPairId));
      syncEntriesFromSubjects();
      renderAll();
    },
    (subject) => {
      const teacher = state.teachers.find((x) => x.id === subject.teacherId)?.name || "-";
      const cls = state.classes.find((x) => x.id === subject.classId)?.name || "-";
      const grp = subject.groupIndex ? ` · гр.${subject.groupIndex}` : "";
      const mode = subject.sameTime ? " · групи одночасно" : (subject.groupPairId ? " · групи окремо" : "");
      return `${subject.name} — ${teacher} · ${cls}${grp}${mode} · ${subject.lessonsPerWeek} год/тиж.`;
    },
  );
}

function syncEntriesFromSubjects() {
  const bySubject = new Map();
  state.scheduleEntries.forEach((entry) => {
    if (!bySubject.has(entry.subjectId)) bySubject.set(entry.subjectId, []);
    bySubject.get(entry.subjectId).push(entry);
  });

  const next = [];
  state.subjects.forEach((subject) => {
    const existing = bySubject.get(subject.id) || [];
    for (let i = 0; i < subject.lessonsPerWeek; i += 1) {
      next.push(existing[i] || { id: uid(), subjectId: subject.id, day: null, lesson: null, roomId: "" });
    }
  });
  state.scheduleEntries = next;
}

function getSubject(entry) {
  return state.subjects.find((s) => s.id === entry.subjectId);
}

function getSiblingEntry(entry) {
  const subject = getSubject(entry);
  if (!subject?.groupPairId || !subject.sameTime) return null;
  const siblingSubject = state.subjects.find((s) => s.groupPairId === subject.groupPairId && s.groupIndex !== subject.groupIndex);
  if (!siblingSubject) return null;
  return state.scheduleEntries.find((e) => e.subjectId === siblingSubject.id) || null;
}

function isAllowedParallelClass(s1, s2) {
  return Boolean(
    s1.groupPairId
    && s2.groupPairId
    && s1.groupPairId === s2.groupPairId
    && s1.sameTime
    && s2.sameTime
    && s1.groupIndex !== s2.groupIndex,
  );
}

function matchesView(entry, subject) {
  if (state.viewMode === "class") return subject.classId === state.viewTarget;
  if (state.viewMode === "teacher") return subject.teacherId === state.viewTarget;
  return true;
}

function conflicts(entry, day, lesson, roomId) {
  const subject = getSubject(entry);
  if (!subject) return true;

  return state.scheduleEntries.some((other) => {
    if (other.id === entry.id || other.day !== day || other.lesson !== lesson) return false;
    const otherSubj = getSubject(other);
    if (!otherSubj) return false;

    const classConflict = otherSubj.classId === subject.classId && !isAllowedParallelClass(subject, otherSubj);
    const teacherConflict = otherSubj.teacherId === subject.teacherId;
    const roomConflict = Boolean(roomId && other.roomId && other.roomId === roomId);
    return classConflict || teacherConflict || roomConflict;
  });
}

function randomRoomId() {
  return state.rooms[Math.floor(Math.random() * state.rooms.length)]?.id || "";
}

function tryPlaceEntry(entry, day, lesson) {
  const roomId = entry.roomId || randomRoomId();
  if (conflicts(entry, day, lesson, roomId)) return false;

  const sibling = getSiblingEntry(entry);
  if (sibling) {
    const sibRoom = sibling.roomId || randomRoomId();
    if (conflicts(sibling, day, lesson, sibRoom)) return false;
    sibling.day = day;
    sibling.lesson = lesson;
    sibling.roomId = sibRoom;
  }

  entry.day = day;
  entry.lesson = lesson;
  entry.roomId = roomId;
  return true;
}

function autoSchedule() {
  if (!state.classes.length || !state.rooms.length || !state.teachers.length || !state.subjects.length) {
    alert("Додайте класи, кабінети, вчителів і предмети перед автозаповненням.");
    return;
  }

  const unplaced = state.scheduleEntries.filter((e) => e.day === null || e.lesson === null);
  unplaced.forEach((entry) => {
    if (entry.day !== null && entry.lesson !== null) return;
    for (let day = 0; day < state.dayLabels.length; day += 1) {
      let done = false;
      for (let lesson = 0; lesson < state.lessonCount; lesson += 1) {
        if (tryPlaceEntry(entry, day, lesson)) {
          done = true;
          break;
        }
      }
      if (done) break;
    }
  });

  renderSchedule();
}

function makeTile(entry) {
  const subject = getSubject(entry);
  if (!subject) return null;
  const teacher = state.teachers.find((t) => t.id === subject.teacherId)?.name || "-";
  const cls = state.classes.find((c) => c.id === subject.classId)?.name || "-";
  const room = state.rooms.find((r) => r.id === entry.roomId)?.name || "не призначено";
  const group = subject.groupIndex ? ` · гр.${subject.groupIndex}` : "";

  const tile = document.createElement("div");
  tile.className = "tile";
  tile.draggable = true;
  tile.dataset.entryId = entry.id;
  tile.innerHTML = `<strong>${subject.name}${group}</strong><small>${teacher}</small><small>Клас: ${cls}</small><small>Кабінет: ${room}</small>`;
  tile.addEventListener("dragstart", () => tile.classList.add("dragging"));
  tile.addEventListener("dragend", () => tile.classList.remove("dragging"));
  return tile;
}

function renderLessonSchedule() {
  createLessonGrid();
  document.querySelectorAll(".slot").forEach((slot) => (slot.innerHTML = ""));
  el.tilePool.innerHTML = "";

  state.scheduleEntries.forEach((entry) => {
    const subject = getSubject(entry);
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
    buildWeekTable(state.teachers.map((t) => t.id), "teacher");
    el.poolTitle.style.display = "none";
    el.tilePool.style.display = "none";
    return;
  }
  if (state.viewMode === "teacher-week") {
    buildWeekTable(state.viewTarget ? [state.viewTarget] : [], "teacher");
    el.poolTitle.style.display = "none";
    el.tilePool.style.display = "none";
    return;
  }
  if (state.viewMode === "class-week") {
    buildWeekTable(state.viewTarget ? [state.viewTarget] : [], "class");
    el.poolTitle.style.display = "none";
    el.tilePool.style.display = "none";
    return;
  }

  el.poolTitle.style.display = "block";
  el.tilePool.style.display = "block";
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
        const sibling = getSiblingEntry(entry);
        if (sibling) {
          sibling.day = null;
          sibling.lesson = null;
          sibling.roomId = "";
        }
        renderSchedule();
        return;
      }

      const day = Number(zone.dataset.day);
      const lesson = Number(zone.dataset.lesson);
      if (!tryPlaceEntry(entry, day, lesson)) {
        alert("Конфлікт: клас/вчитель/кабінет вже зайнятий або неможливо поставити групу.");
        return;
      }
      renderSchedule();
    });
  });
}

function collectScheduleMatrix() {
  const isTeacherWeek = state.viewMode === "teachers-week-all" || state.viewMode === "teacher-week";
  if (isTeacherWeek) {
    const ids = state.viewMode === "teacher-week" ? (state.viewTarget ? [state.viewTarget] : []) : state.teachers.map((t) => t.id);
    const matrix = [["Вчитель", ...state.dayLabels]];
    ids.forEach((id) => {
      const teacher = state.teachers.find((t) => t.id === id);
      if (!teacher) return;
      const row = [teacher.name];
      state.dayLabels.forEach((_, dayIdx) => {
        const cell = state.scheduleEntries
          .filter((e) => e.day === dayIdx)
          .map((e) => ({ e, s: getSubject(e) }))
          .filter((x) => x.s && x.s.teacherId === id)
          .sort((a, b) => a.e.lesson - b.e.lesson)
          .map((x) => {
            const cls = state.classes.find((c) => c.id === x.s.classId)?.name || "-";
            const room = state.rooms.find((r) => r.id === x.e.roomId)?.name || "-";
            return `${x.e.lesson + 1}. ${x.s.name} (${cls}, каб.${room})`;
          })
          .join("\n");
        row.push(cell);
      });
      matrix.push(row);
    });
    return matrix;
  }

  if (state.viewMode === "class-week") {
    const ids = state.viewTarget ? [state.viewTarget] : [];
    const matrix = [["Клас", ...state.dayLabels]];
    ids.forEach((id) => {
      const cls = state.classes.find((c) => c.id === id);
      if (!cls) return;
      const row = [cls.name];
      state.dayLabels.forEach((_, dayIdx) => {
        const cell = state.scheduleEntries
          .filter((e) => e.day === dayIdx)
          .map((e) => ({ e, s: getSubject(e) }))
          .filter((x) => x.s && x.s.classId === id)
          .sort((a, b) => a.e.lesson - b.e.lesson)
          .map((x) => {
            const teacher = state.teachers.find((t) => t.id === x.s.teacherId)?.name || "-";
            const room = state.rooms.find((r) => r.id === x.e.roomId)?.name || "-";
            return `${x.e.lesson + 1}. ${x.s.name} (${teacher}, каб.${room})`;
          })
          .join("\n");
        row.push(cell);
      });
      matrix.push(row);
    });
    return matrix;
  }

  const matrix = [["Урок", ...state.dayLabels]];
  for (let lesson = 0; lesson < state.lessonCount; lesson += 1) {
    const row = [String(lesson + 1)];
    for (let day = 0; day < state.dayLabels.length; day += 1) {
      const cell = state.scheduleEntries
        .filter((e) => e.day === day && e.lesson === lesson)
        .map((e) => ({ e, s: getSubject(e) }))
        .filter((x) => x.s && matchesView(x.e, x.s))
        .map((x) => {
          const teacher = state.teachers.find((t) => t.id === x.s.teacherId)?.name || "-";
          const cls = state.classes.find((c) => c.id === x.s.classId)?.name || "-";
          const room = state.rooms.find((r) => r.id === x.e.roomId)?.name || "-";
          return `${x.s.name} | ${teacher} | ${cls} | каб.${room}`;
        })
        .join("\n");
      row.push(cell);
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
  const csv = collectScheduleMatrix().map((r) => r.map((c) => `"${String(c).replaceAll('"', '""')}"`).join(",")).join("\n");
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
    rows.forEach((row) => { if (uniqPushByName(state.classes, row[0])) added += 1; });
  }
  if (type === "rooms") {
    rows.forEach((row) => { if (uniqPushByName(state.rooms, row[0])) added += 1; });
  }
  if (type === "teachers") {
    rows.forEach((row) => {
      const teacher = uniqPushByName(state.teachers, row[0], { allowedSubjects: [] });
      if (teacher) {
        const subjectsCell = String(row[1] || "").trim();
        if (subjectsCell) teacher.allowedSubjects = subjectsCell.split(/[;,]/).map((x) => x.trim()).filter(Boolean);
        added += 1;
      }
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
    el.teacherInput.value = "";
    renderAll();
  }
});

el.groupMode.addEventListener("change", refreshSelectors);

el.subjectForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const name = el.subjectName.value.trim();
  const teacherId = el.subjectTeacher.value;
  const classId = el.subjectClass.value;
  const lessons = Number(el.subjectLessons.value);
  const mode = el.groupMode.value;
  const teacher2Id = el.subjectTeacher2.value || teacherId;

  if (!name || !teacherId || !classId || !lessons) return;

  const t1 = state.teachers.find((t) => t.id === teacherId);
  const t2 = state.teachers.find((t) => t.id === teacher2Id);
  if (!t1) return;

  const allow1 = t1.allowedSubjects.length === 0 || t1.allowedSubjects.some((s) => s.toLowerCase() === name.toLowerCase());
  const allow2 = !t2 || t2.allowedSubjects.length === 0 || t2.allowedSubjects.some((s) => s.toLowerCase() === name.toLowerCase());
  if (!allow1 || !allow2) {
    alert("Один із вчителів не має цього предмета у переліку.");
    return;
  }

  if (mode === "none") {
    state.subjects.push({
      id: uid(), name, teacherId, classId, lessonsPerWeek: lessons,
      groupPairId: "", groupIndex: 0, sameTime: false,
    });
  } else {
    const pairId = uid();
    const simultaneous = mode === "split-simultaneous";
    state.subjects.push({
      id: uid(), name, teacherId, classId, lessonsPerWeek: lessons,
      groupPairId: pairId, groupIndex: 1, sameTime: simultaneous,
    });
    state.subjects.push({
      id: uid(), name, teacherId: teacher2Id, classId, lessonsPerWeek: lessons,
      groupPairId: pairId, groupIndex: 2, sameTime: simultaneous,
    });
  }

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
