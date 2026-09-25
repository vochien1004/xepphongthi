import { Student, RoomAssignment, ExamRoomConfig } from '../types';

// Split Vietnamese name into { first: 'An', lastAndMiddle: 'Nguyễn Văn' } for accurate Vietnamese sorting
export function splitVietnameseName(fullName: string): { first: string; lastAndMiddle: string } {
  const clean = fullName.trim();
  const lastSpaceIdx = clean.lastIndexOf(' ');
  if (lastSpaceIdx === -1) {
    return { first: clean, lastAndMiddle: '' };
  }
  return {
    first: clean.substring(lastSpaceIdx + 1),
    lastAndMiddle: clean.substring(0, lastSpaceIdx).trim(),
  };
}

// Compare Vietnamese strings with standard localeCompare
export function compareVietnamese(a: string, b: string): number {
  return a.localeCompare(b, 'vi', { sensitivity: 'base' });
}

// Sort students according to config
export function sortStudents(students: Student[], sortBy: 'soBD' | 'ten' | 'lop'): Student[] {
  const copy = [...students];
  if (sortBy === 'soBD') {
    return copy.sort((a, b) => {
      // Natural alphanumeric sort
      return a.soBD.localeCompare(b.soBD, undefined, { numeric: true, sensitivity: 'base' });
    });
  } else if (sortBy === 'ten') {
    return copy.sort((a, b) => {
      const nameA = splitVietnameseName(a.hoTen);
      const nameB = splitVietnameseName(b.hoTen);
      const cmpFirst = compareVietnamese(nameA.first, nameB.first);
      if (cmpFirst !== 0) return cmpFirst;
      const cmpLast = compareVietnamese(nameA.lastAndMiddle, nameB.lastAndMiddle);
      if (cmpLast !== 0) return cmpLast;
      return a.soBD.localeCompare(b.soBD, undefined, { numeric: true, sensitivity: 'base' });
    });
  } else if (sortBy === 'lop') {
    return copy.sort((a, b) => {
      const cmpLop = a.lop.localeCompare(b.lop, undefined, { numeric: true });
      if (cmpLop !== 0) return cmpLop;
      const nameA = splitVietnameseName(a.hoTen);
      const nameB = splitVietnameseName(b.hoTen);
      return compareVietnamese(nameA.first, nameB.first);
    });
  }
  return copy;
}

// Main Room Arranging Algorithm supporting both Manual allocation per Grade/Subject and Auto allocation
export function arrangeRooms(
  students: Student[],
  config: ExamRoomConfig,
  subjectId?: string,
  subjectName?: string
): RoomAssignment[] {
  // Group students by Grade (Khối)
  const gradeGroups: Record<string, Student[]> = {};
  students.forEach((s) => {
    const k = (s.khoi || '12').trim();
    if (!gradeGroups[k]) gradeGroups[k] = [];
    gradeGroups[k].push(s);
  });

  const allRooms: RoomAssignment[] = [];
  const sortedGrades = Object.keys(gradeGroups).sort((a, b) => {
    const numA = parseInt(a, 10) || 0;
    const numB = parseInt(b, 10) || 0;
    return numA - numB;
  });

  sortedGrades.forEach((grade) => {
    let gradeStudents = gradeGroups[grade];

    // If subjectId is provided and class-subject restriction is configured, filter students
    if (subjectId && config.classSubjects) {
      gradeStudents = gradeStudents.filter((s) => {
        const allowedSubs = config.classSubjects?.[s.lop];
        return !allowedSubs || allowedSubs.length === 0 || allowedSubs.includes(subjectId);
      });
    }

    const sortedStudents = sortStudents(gradeStudents, config.sortBy);
    const totalStudentsInGrade = sortedStudents.length;
    if (totalStudentsInGrade === 0) return;

    // Check if there is a manual room plan for this Grade (or Grade_Subject)
    const planKeySubject = subjectId ? `${grade}_${subjectId}` : undefined;
    const manualPlan =
      (planKeySubject && config.manualRoomPlans?.[planKeySubject]) ||
      config.manualRoomPlans?.[grade] ||
      config.manualRoomPlans?.[`${grade}_all`];

    if (manualPlan && manualPlan.rooms && manualPlan.rooms.length > 0) {
      let studentIndex = 0;

      manualPlan.rooms.forEach((roomSpec, rIdx) => {
        const roomCapacity = Math.max(0, roomSpec.capacity || 0);
        const roomStudents = sortedStudents.slice(studentIndex, studentIndex + roomCapacity);
        studentIndex += roomCapacity;

        const roomNum = roomSpec.roomNumber || rIdx + 1;
        const prefix = config.roomPrefix || 'P';
        const roomCode = roomSpec.roomCode || `${prefix}${roomNum}`;
        const location = roomSpec.location || `Phòng ${roomNum} (Lớp ${grade}A${roomNum})`;

        if (roomStudents.length > 0) {
          allRooms.push({
            roomCode,
            roomNumber: roomNum,
            grade,
            students: roomStudents,
            location,
            subjectId,
            subjectName,
          });
        }
      });

      // Handle any leftover students if total manual capacity < total students in grade
      if (studentIndex < totalStudentsInGrade) {
        const remainingStudents = sortedStudents.slice(studentIndex);
        if (allRooms.length > 0 && allRooms[allRooms.length - 1].grade === grade) {
          allRooms[allRooms.length - 1].students.push(...remainingStudents);
        } else {
          const nextRoomNum = manualPlan.rooms.length + 1;
          const prefix = config.roomPrefix || 'P';
          allRooms.push({
            roomCode: `${prefix}${nextRoomNum}`,
            roomNumber: nextRoomNum,
            grade,
            students: remainingStudents,
            location: `Phòng ${nextRoomNum} (Bổ sung)`,
            subjectId,
            subjectName,
          });
        }
      }
    } else {
      // Default Automatic allocation based on maxPerRoom
      const maxPerRoom = config.gradeConfigs?.[grade]?.maxPerRoom || config.defaultMaxPerRoom || 24;
      const numRooms = Math.ceil(totalStudentsInGrade / maxPerRoom);

      for (let r = 0; r < numRooms; r++) {
        const startIdx = r * maxPerRoom;
        const endIdx = Math.min(startIdx + maxPerRoom, totalStudentsInGrade);
        const roomStudents = sortedStudents.slice(startIdx, endIdx);

        if (roomStudents.length > 0) {
          const roomNum = r + 1;
          const prefix = config.roomPrefix || 'P';
          const roomCode = `${prefix}${roomNum}`;

          allRooms.push({
            roomCode,
            roomNumber: roomNum,
            grade,
            students: roomStudents,
            location: `Phòng ${roomNum} (Lớp ${grade}A${roomNum})`,
            subjectId,
            subjectName,
          });
        }
      }
    }
  });

  return allRooms;
}
