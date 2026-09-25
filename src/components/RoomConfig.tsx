import React, { useState, useMemo, useEffect } from 'react';
import { 
  Student, 
  ExamRoomConfig, 
  Subject, 
  RoomAssignment,
  ManualRoomSpec,
  GradeSubjectRoomPlan
} from '../types';
import { 
  Settings2, 
  BookOpen, 
  DoorOpen, 
  Sparkles, 
  CheckCircle2, 
  Plus, 
  Trash2, 
  Sliders, 
  GraduationCap, 
  Layers, 
  Grid, 
  ListFilter, 
  Copy, 
  CheckSquare, 
  Square, 
  AlertCircle, 
  ArrowRight, 
  Calculator, 
  Equal, 
  Check, 
  CloudCheck, 
  Save, 
  CheckCheck,
  X 
} from 'lucide-react';

interface RoomConfigProps {
  config: ExamRoomConfig;
  onUpdateConfig: (config: ExamRoomConfig) => void;
  students: Student[];
  subjects: Subject[];
  onUpdateSubjects: (subjects: Subject[]) => void;
  rooms: RoomAssignment[];
  onNavigateToStudents?: () => void;
}

export const RoomConfig: React.FC<RoomConfigProps> = ({
  config,
  onUpdateConfig,
  students,
  subjects,
  onUpdateSubjects,
  rooms,
  onNavigateToStudents,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'manual-rooms' | 'class-subjects' | 'subjects' | 'preview'>('manual-rooms');
  
  // --- 1. Dynamic Khối (Grades) extracted from imported students ---
  const dynamicGrades = useMemo(() => {
    const rawGrades = Array.from(
      new Set(
        students
          .map((s) => (s.khoi || '').trim())
          .filter(Boolean)
      )
    );
    if (rawGrades.length === 0) {
      return ['10', '11', '12'];
    }
    return rawGrades.sort((a, b) => {
      const numA = parseInt(a, 10);
      const numB = parseInt(b, 10);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return a.localeCompare(b, undefined, { numeric: true });
    });
  }, [students]);

  // Selected Grade for Manual Room Planning
  const [selectedGrade, setSelectedGrade] = useState<string>(() => dynamicGrades[0] || '12');

  // Subjects applicable to the selected grade
  const gradeSubjects = useMemo(() => {
    return subjects.filter((sub) => sub.grades.includes(selectedGrade) || sub.grades.length === 0);
  }, [subjects, selectedGrade]);

  // Multi-subject selection state (array of subject IDs)
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([]);
  const [applyToGradeDefault, setApplyToGradeDefault] = useState<boolean>(true);

  // Auto-initialize selected subjects when Grade or Subjects change
  useEffect(() => {
    if (gradeSubjects.length > 0) {
      setSelectedSubjectIds(gradeSubjects.map((s) => s.id));
    } else {
      setSelectedSubjectIds([]);
    }
  }, [selectedGrade, gradeSubjects.length]);

  // Ensure selectedGrade is valid when dynamicGrades change
  useEffect(() => {
    if (dynamicGrades.length > 0 && !dynamicGrades.includes(selectedGrade)) {
      setSelectedGrade(dynamicGrades[0]);
    }
  }, [dynamicGrades, selectedGrade]);

  // Subject Tab State
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newSubjectCode, setNewSubjectCode] = useState('');
  const [newSubjectGrades, setNewSubjectGrades] = useState<string[]>(['10', '11', '12']);
  const [subjectToDelete, setSubjectToDelete] = useState<Subject | null>(null);

  // Class-Subject Tab State
  const [classGradeFilter, setClassGradeFilter] = useState<string>('all');
  const [selectedClassName, setSelectedClassName] = useState<string>('');
  const [classViewMode, setClassViewMode] = useState<'detailed' | 'matrix'>('detailed');
  const [newCustomClassName, setNewCustomClassName] = useState('');
  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);
  const [copySourceClass, setCopySourceClass] = useState<string>('');
  const [copyTargetClasses, setCopyTargetClasses] = useState<string[]>([]);
  
  // Grade Room Copy Modal State
  const [isCopyGradeModalOpen, setIsCopyGradeModalOpen] = useState(false);
  const [copyTargetGrades, setCopyTargetGrades] = useState<string[]>([]);
  
  // Toast
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3500);
  };

  // Derive unique classes from students + customClasses
  const studentClasses = Array.from(new Set(students.map((s) => s.lop).filter(Boolean)));
  const customClasses = config.customClasses || [];
  const allClasses = Array.from(new Set([...studentClasses, ...customClasses])).sort((a, b) => {
    return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
  });

  const currentActiveClassName = selectedClassName || allClasses[0] || '';

  const filteredClasses = allClasses.filter((c) => {
    if (classGradeFilter === 'all') return true;
    return c.startsWith(classGradeFilter);
  });

  // Calculate student count for a single subject in this grade
  const getSubjectStudentCount = (subId: string): number => {
    let filtered = students.filter((s) => (s.khoi || '').trim() === selectedGrade.trim());
    if (config.classSubjects) {
      filtered = filtered.filter((s) => {
        const allowedSubs = config.classSubjects?.[s.lop];
        return !allowedSubs || allowedSubs.length === 0 || allowedSubs.includes(subId);
      });
    }
    return filtered.length;
  };

  // Calculate representative total eligible students for currently selected subjects
  const totalEligibleCount = useMemo(() => {
    const totalInGrade = students.filter((s) => (s.khoi || '').trim() === selectedGrade.trim()).length;
    if (selectedSubjectIds.length === 0) {
      return totalInGrade;
    }
    // Return max students among selected subjects
    const counts = selectedSubjectIds.map((id) => getSubjectStudentCount(id));
    const maxVal = Math.max(...counts, 0);
    return maxVal > 0 ? maxVal : totalInGrade;
  }, [students, selectedGrade, selectedSubjectIds, config.classSubjects]);

  // Retrieve current room plan
  const currentPlan: GradeSubjectRoomPlan = useMemo(() => {
    const plans = config.manualRoomPlans || {};
    
    // 1. Try to match any of the selected subjects
    for (const subId of selectedSubjectIds) {
      const key = `${selectedGrade}_${subId}`;
      if (plans[key] && plans[key].rooms && plans[key].rooms.length > 0) {
        return plans[key];
      }
    }

    // 2. Try grade-level default template
    if (plans[selectedGrade] && plans[selectedGrade].rooms && plans[selectedGrade].rooms.length > 0) {
      return plans[selectedGrade];
    }
    if (plans[`${selectedGrade}_all`] && plans[`${selectedGrade}_all`].rooms && plans[`${selectedGrade}_all`].rooms.length > 0) {
      return plans[`${selectedGrade}_all`];
    }
    
    // 3. Auto-calculate initial rooms based on standard 24 students/room
    const defaultCap = config.gradeConfigs?.[selectedGrade]?.maxPerRoom || config.defaultMaxPerRoom || 24;
    const estimatedRoomsCount = Math.max(1, Math.ceil(totalEligibleCount / defaultCap) || 1);
    
    const initialRooms: ManualRoomSpec[] = [];
    let remaining = totalEligibleCount;

    for (let i = 1; i <= estimatedRoomsCount; i++) {
      const cap = Math.min(defaultCap, remaining > 0 ? remaining : defaultCap);
      initialRooms.push({
        roomCode: `${config.roomPrefix || 'P'}${i}`,
        roomNumber: i,
        capacity: totalEligibleCount > 0 ? (i === estimatedRoomsCount ? remaining : defaultCap) : defaultCap,
        location: `Phòng ${i} (Lớp ${selectedGrade}A${i})`,
      });
      remaining -= defaultCap;
      if (remaining < 0) remaining = 0;
    }

    return {
      grade: selectedGrade,
      roomCount: estimatedRoomsCount,
      rooms: initialRooms,
    };
  }, [config.manualRoomPlans, selectedGrade, selectedSubjectIds, totalEligibleCount, config.gradeConfigs, config.defaultMaxPerRoom, config.roomPrefix]);

  // Current allocated sum of seats
  const totalAllocatedSeats = useMemo(() => {
    return currentPlan.rooms.reduce((sum, r) => sum + (Number(r.capacity) || 0), 0);
  }, [currentPlan.rooms]);

  const seatDifference = totalAllocatedSeats - totalEligibleCount;

  // Save updated plan to config (persists for all selected subjects + grade default)
  const handleSavePlan = (updatedPlan: GradeSubjectRoomPlan, toastMsg?: string) => {
    const updatedPlans = { ...(config.manualRoomPlans || {}) };

    // Save for every checked subject
    selectedSubjectIds.forEach((subId) => {
      updatedPlans[`${selectedGrade}_${subId}`] = {
        ...updatedPlan,
        grade: selectedGrade,
        subjectId: subId,
      };
    });

    // Also update Grade default template if applyToGradeDefault is true or all subjects selected
    if (applyToGradeDefault || selectedSubjectIds.length === 0 || selectedSubjectIds.length === gradeSubjects.length) {
      updatedPlans[selectedGrade] = {
        ...updatedPlan,
        grade: selectedGrade,
        subjectId: 'all',
      };
      updatedPlans[`${selectedGrade}_all`] = {
        ...updatedPlan,
        grade: selectedGrade,
        subjectId: 'all',
      };
    }

    onUpdateConfig({
      ...config,
      manualRoomPlans: updatedPlans,
    });

    if (toastMsg) {
      showToast(toastMsg);
    }
  };

  // Toggle single subject checkbox
  const handleToggleSubject = (subId: string) => {
    setSelectedSubjectIds((prev) => {
      const exists = prev.includes(subId);
      const next = exists ? prev.filter((id) => id !== subId) : [...prev, subId];
      return next;
    });
  };

  // Select all subjects for current grade
  const handleSelectAllSubjects = () => {
    setSelectedSubjectIds(gradeSubjects.map((s) => s.id));
    showToast(`Đã chọn tất cả ${gradeSubjects.length} môn của Khối ${selectedGrade}`);
  };

  // Deselect all subjects
  const handleDeselectAllSubjects = () => {
    setSelectedSubjectIds([]);
  };

  // Multi-subject Preset filters
  const handleSelectSubjectPreset = (presetType: 'khtn' | 'khxh' | 'core') => {
    let matchedSubjects: Subject[] = [];
    if (presetType === 'khtn') {
      const keywords = ['toán', 'vật lý', 'vật lí', 'hóa học', 'hoá học', 'sinh học', 'ngữ văn', 'văn', 'tiếng anh', 'anh'];
      matchedSubjects = gradeSubjects.filter((s) => keywords.some((k) => s.name.toLowerCase().includes(k)));
    } else if (presetType === 'khxh') {
      const keywords = ['ngữ văn', 'văn', 'lịch sử', 'địa lý', 'địa lí', 'gdcd', 'kinh tế', 'pháp luật', 'toán', 'tiếng anh', 'anh'];
      matchedSubjects = gradeSubjects.filter((s) => keywords.some((k) => s.name.toLowerCase().includes(k)));
    } else if (presetType === 'core') {
      const keywords = ['toán', 'ngữ văn', 'văn', 'tiếng anh', 'anh'];
      matchedSubjects = gradeSubjects.filter((s) => keywords.some((k) => s.name.toLowerCase().includes(k)));
    }

    const matchedIds = matchedSubjects.map((s) => s.id);
    setSelectedSubjectIds(matchedIds);
    showToast(`Đã chọn ${matchedIds.length} môn theo tổ hợp ${presetType.toUpperCase()}`);
  };

  // Handler: When user changes the number of rooms (N)
  const handleRoomCountChange = (newCountVal: number) => {
    const newCount = Math.max(1, Math.min(50, newCountVal || 1));
    const currentRooms = [...currentPlan.rooms];
    const prefix = config.roomPrefix || 'P';

    let updatedRooms: ManualRoomSpec[] = [];

    if (newCount > currentRooms.length) {
      updatedRooms = [...currentRooms];
      for (let i = currentRooms.length + 1; i <= newCount; i++) {
        updatedRooms.push({
          roomCode: `${prefix}${i}`,
          roomNumber: i,
          capacity: config.defaultMaxPerRoom || 24,
          location: `Phòng ${i} (Lớp ${selectedGrade}A${i})`,
        });
      }
    } else if (newCount < currentRooms.length) {
      updatedRooms = currentRooms.slice(0, newCount);
    } else {
      updatedRooms = currentRooms;
    }

    updatedRooms = updatedRooms.map((r, idx) => ({
      ...r,
      roomNumber: idx + 1,
      roomCode: `${prefix}${idx + 1}`,
      location: r.location || `Phòng ${idx + 1} (Lớp ${selectedGrade}A${idx + 1})`,
    }));

    handleSavePlan(
      {
        ...currentPlan,
        roomCount: newCount,
        rooms: updatedRooms,
      },
      `Đã cập nhật ${newCount} phòng (P1 → ${prefix}${newCount}) cho ${selectedSubjectIds.length} môn đã chọn`
    );
  };

  // Handler: Change capacity of a single room
  const handleRoomCapacityChange = (roomIndex: number, newCapacity: number) => {
    const validCap = Math.max(0, Math.min(100, isNaN(newCapacity) ? 0 : newCapacity));
    const updatedRooms = currentPlan.rooms.map((r, idx) => {
      if (idx === roomIndex) {
        return { ...r, capacity: validCap };
      }
      return r;
    });

    handleSavePlan({
      ...currentPlan,
      rooms: updatedRooms,
    });
  };

  // Handler: Change location of a single room
  const handleRoomLocationChange = (roomIndex: number, newLocation: string) => {
    const updatedRooms = currentPlan.rooms.map((r, idx) => {
      if (idx === roomIndex) {
        return { ...r, location: newLocation };
      }
      return r;
    });

    handleSavePlan({
      ...currentPlan,
      rooms: updatedRooms,
    });
  };

  // Handler: Smart Quick Action - Chia đều số học sinh vào các phòng
  const handleQuickDistributeEvenly = () => {
    const roomCount = currentPlan.rooms.length;
    if (roomCount === 0 || totalEligibleCount === 0) return;

    const basePerRoom = Math.floor(totalEligibleCount / roomCount);
    let remainder = totalEligibleCount % roomCount;

    const updatedRooms = currentPlan.rooms.map((r) => {
      let cap = basePerRoom;
      if (remainder > 0) {
        cap += 1;
        remainder--;
      }
      return {
        ...r,
        capacity: cap,
      };
    });

    handleSavePlan(
      {
        ...currentPlan,
        rooms: updatedRooms,
      },
      `Đã chia đều ${totalEligibleCount} học sinh vào ${roomCount} phòng!`
    );
  };

  // Handler: Smart Quick Action - Điền chuẩn (Standard 24 or 30 capacity)
  const handleQuickFillStandard = (standardCap: number) => {
    const roomCount = currentPlan.rooms.length;
    if (roomCount === 0) return;

    let remaining = totalEligibleCount;
    const updatedRooms = currentPlan.rooms.map((r, idx) => {
      if (idx === roomCount - 1) {
        return { ...r, capacity: Math.max(0, remaining) };
      }
      const cap = Math.min(standardCap, remaining > 0 ? remaining : standardCap);
      remaining -= cap;
      return { ...r, capacity: cap };
    });

    handleSavePlan(
      {
        ...currentPlan,
        rooms: updatedRooms,
      },
      `Đã phân bổ theo chuẩn ${standardCap} học sinh/phòng cho các môn đã chọn!`
    );
  };

  // Handler: Smart Quick Action - Cân bằng vào phòng cuối cùng
  const handleQuickBalanceLastRoom = () => {
    const roomCount = currentPlan.rooms.length;
    if (roomCount === 0) return;

    const sumExceptLast = currentPlan.rooms
      .slice(0, roomCount - 1)
      .reduce((sum, r) => sum + (Number(r.capacity) || 0), 0);

    const neededInLast = Math.max(0, totalEligibleCount - sumExceptLast);

    const updatedRooms = currentPlan.rooms.map((r, idx) => {
      if (idx === roomCount - 1) {
        return { ...r, capacity: neededInLast };
      }
      return r;
    });

    handleSavePlan(
      {
        ...currentPlan,
        rooms: updatedRooms,
      },
      `Đã cân bằng phòng cuối P${roomCount}: ${neededInLast} học sinh (Khớp 100%)`
    );
  };

  // Handler: Open Copy to other Grades modal
  const handleOpenCopyGradeModal = () => {
    setCopyTargetGrades(dynamicGrades.filter((g) => g !== selectedGrade));
    setIsCopyGradeModalOpen(true);
  };

  const handleExecuteCopyGrade = () => {
    if (copyTargetGrades.length === 0) return;
    const updatedPlans = { ...(config.manualRoomPlans || {}) };

    copyTargetGrades.forEach((tgtGrade) => {
      const tgtStudentCount = students.filter((s) => (s.khoi || '').trim() === tgtGrade.trim()).length;
      const roomCount = currentPlan.rooms.length;
      const basePerRoom = Math.floor(tgtStudentCount / roomCount) || 24;
      let remainder = tgtStudentCount % roomCount;

      const adaptedRooms: ManualRoomSpec[] = currentPlan.rooms.map((r) => {
        let cap = basePerRoom;
        if (remainder > 0) {
          cap += 1;
          remainder--;
        }
        return {
          ...r,
          capacity: tgtStudentCount > 0 ? cap : (r.capacity || 24),
          location: `Phòng ${r.roomNumber} (Lớp ${tgtGrade}A${r.roomNumber})`,
        };
      });

      updatedPlans[tgtGrade] = {
        grade: tgtGrade,
        subjectId: 'all',
        roomCount: roomCount,
        rooms: adaptedRooms,
      };

      // Also copy to all subjects in target grade
      subjects.filter((sub) => sub.grades.includes(tgtGrade)).forEach((sub) => {
        updatedPlans[`${tgtGrade}_${sub.id}`] = {
          grade: tgtGrade,
          subjectId: sub.id,
          roomCount: roomCount,
          rooms: adaptedRooms,
        };
      });
    });

    onUpdateConfig({
      ...config,
      manualRoomPlans: updatedPlans,
    });

    showToast(`Đã sao chép cấu hình phòng sang ${copyTargetGrades.map((g) => `Khối ${g}`).join(', ')} và lưu trên Firebase!`);
    setIsCopyGradeModalOpen(false);
  };

  // Sorting rule handler
  const handleSortChange = (sortBy: 'soBD' | 'ten' | 'lop') => {
    onUpdateConfig({
      ...config,
      sortBy,
    });
    showToast(`Đã đổi quy tắc sắp xếp: ${sortBy === 'soBD' ? 'Số báo danh' : sortBy === 'ten' ? 'Tên tiếng Việt (A-Z)' : 'Lớp'}`);
  };

  // --- Handlers for Subject Tab ---
  const handleAddSubject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubjectName.trim()) return;

    const newSub: Subject = {
      id: `sub_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      code: newSubjectCode.trim().toUpperCase() || newSubjectName.trim().substring(0, 4).toUpperCase(),
      name: newSubjectName.trim(),
      grades: newSubjectGrades.length > 0 ? newSubjectGrades : ['10', '11', '12'],
    };

    onUpdateSubjects([...subjects, newSub]);
    setNewSubjectName('');
    setNewSubjectCode('');
    showToast(`Đã thêm môn thi: ${newSub.name}`);
  };

  const executeDeleteSubject = () => {
    if (!subjectToDelete) return;
    const filtered = subjects.filter((s) => s.id !== subjectToDelete.id);
    
    // Clean up from classSubjects
    const updatedClassSubjects = { ...(config.classSubjects || {}) };
    Object.keys(updatedClassSubjects).forEach((cls) => {
      updatedClassSubjects[cls] = (updatedClassSubjects[cls] || []).filter((id) => id !== subjectToDelete.id);
    });

    onUpdateConfig({
      ...config,
      classSubjects: updatedClassSubjects,
    });
    onUpdateSubjects(filtered);
    showToast(`Đã xóa môn thi "${subjectToDelete.name}" thành công!`);
    setSubjectToDelete(null);
  };

  const toggleGradeForSubject = (grade: string) => {
    if (newSubjectGrades.includes(grade)) {
      setNewSubjectGrades(newSubjectGrades.filter((g) => g !== grade));
    } else {
      setNewSubjectGrades([...newSubjectGrades, grade]);
    }
  };

  // --- Handlers for Class-Subject Mapping ---
  const getAssignedSubjectIds = (className: string): string[] => {
    const mapping = config.classSubjects || {};
    return mapping[className] || [];
  };

  const handleToggleSubjectForClass = (className: string, subjectId: string) => {
    const currentList = getAssignedSubjectIds(className);
    const exists = currentList.includes(subjectId);
    const updatedList = exists
      ? currentList.filter((id) => id !== subjectId)
      : [...currentList, subjectId];

    const updatedMapping = {
      ...(config.classSubjects || {}),
      [className]: updatedList,
    };

    onUpdateConfig({
      ...config,
      classSubjects: updatedMapping,
    });
  };

  const handleSelectAllForClass = (className: string) => {
    const allSubIds = subjects.map((s) => s.id);
    const updatedMapping = {
      ...(config.classSubjects || {}),
      [className]: allSubIds,
    };
    onUpdateConfig({
      ...config,
      classSubjects: updatedMapping,
    });
    showToast(`Đã chọn tất cả ${allSubIds.length} môn cho lớp ${className}`);
  };

  const handleClearAllForClass = (className: string) => {
    const updatedMapping = {
      ...(config.classSubjects || {}),
      [className]: [],
    };
    onUpdateConfig({
      ...config,
      classSubjects: updatedMapping,
    });
    showToast(`Đã xóa toàn bộ môn học đã chọn của lớp ${className}`);
  };

  const handleApplyPreset = (className: string, presetType: 'khtn' | 'khxh' | 'core') => {
    let matchedSubjects: Subject[] = [];
    if (presetType === 'khtn') {
      const keywords = ['toán', 'vật lý', 'vật lí', 'hóa học', 'hoá học', 'sinh học', 'ngữ văn', 'văn', 'tiếng anh', 'anh'];
      matchedSubjects = subjects.filter((s) => keywords.some((k) => s.name.toLowerCase().includes(k)));
    } else if (presetType === 'khxh') {
      const keywords = ['ngữ văn', 'văn', 'lịch sử', 'địa lý', 'địa lí', 'gdcd', 'kinh tế', 'pháp luật', 'toán', 'tiếng anh', 'anh'];
      matchedSubjects = subjects.filter((s) => keywords.some((k) => s.name.toLowerCase().includes(k)));
    } else if (presetType === 'core') {
      const keywords = ['toán', 'ngữ văn', 'văn', 'tiếng anh', 'anh'];
      matchedSubjects = subjects.filter((s) => keywords.some((k) => s.name.toLowerCase().includes(k)));
    }

    const matchedIds = matchedSubjects.map((s) => s.id);
    const updatedMapping = {
      ...(config.classSubjects || {}),
      [className]: matchedIds,
    };

    onUpdateConfig({
      ...config,
      classSubjects: updatedMapping,
    });
    showToast(`Đã áp dụng tổ hợp ${presetType.toUpperCase()} (${matchedIds.length} môn) cho lớp ${className}`);
  };

  const handleApplyToEntireGrade = (className: string) => {
    const gradeMatch = className.match(/^(\d+)/);
    const grade = gradeMatch ? gradeMatch[1] : '';
    if (!grade) return;

    const sourceSubjects = getAssignedSubjectIds(className);
    const sameGradeClasses = allClasses.filter((c) => c.startsWith(grade));

    const updatedMapping = { ...(config.classSubjects || {}) };
    sameGradeClasses.forEach((cls) => {
      updatedMapping[cls] = [...sourceSubjects];
    });

    onUpdateConfig({
      ...config,
      classSubjects: updatedMapping,
    });
    showToast(`Đã áp dụng cấu hình môn của lớp ${className} cho toàn bộ ${sameGradeClasses.length} lớp Khối ${grade}!`);
  };

  const handleAddCustomClass = (e: React.FormEvent) => {
    e.preventDefault();
    const formatted = newCustomClassName.trim().toUpperCase();
    if (!formatted) return;

    if (allClasses.includes(formatted)) {
      showToast(`Lớp ${formatted} đã tồn tại trong danh sách!`);
      return;
    }

    const updatedCustomClasses = [...(config.customClasses || []), formatted];
    onUpdateConfig({
      ...config,
      customClasses: updatedCustomClasses,
    });
    setSelectedClassName(formatted);
    setNewCustomClassName('');
    showToast(`Đã thêm lớp ${formatted} vào hệ thống.`);
  };

  const handleOpenCopyModal = (sourceClass: string) => {
    setCopySourceClass(sourceClass);
    setCopyTargetClasses([]);
    setIsCopyModalOpen(true);
  };

  const handleExecuteCopy = () => {
    if (!copySourceClass || copyTargetClasses.length === 0) return;
    const sourceSubjects = getAssignedSubjectIds(copySourceClass);
    const updatedMapping = { ...(config.classSubjects || {}) };

    copyTargetClasses.forEach((cls) => {
      updatedMapping[cls] = [...sourceSubjects];
    });

    onUpdateConfig({
      ...config,
      classSubjects: updatedMapping,
    });
    showToast(`Đã sao chép cấu hình từ ${copySourceClass} sang ${copyTargetClasses.length} lớp.`);
    setIsCopyModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-2xl p-6 text-white shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-indigo-300 text-xs font-semibold uppercase tracking-wider mb-1">
              <Settings2 className="w-4 h-4" />
              <span>Menu 2: Cấu Hình Phòng Thi & Môn Học Theo Lớp</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Phân Phòng Thi Thủ Công & Môn Học</h1>
            <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-2xl">
              Linh hoạt thiết lập số lượng phòng và sĩ số từng phòng (P1, P2...) theo Khối và Môn thi, hỗ trợ tích chọn nhiều môn cùng lúc và tự động đồng bộ Firebase.
            </p>
          </div>

          <div className="flex flex-wrap items-center bg-white/10 p-1.5 rounded-xl border border-white/10 text-xs font-semibold gap-1">
            <button
              onClick={() => setActiveSubTab('manual-rooms')}
              className={`px-3 py-2 rounded-lg transition cursor-pointer flex items-center space-x-1.5 ${
                activeSubTab === 'manual-rooms' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-300 hover:text-white'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Phân phòng thủ công</span>
            </button>
            <button
              onClick={() => setActiveSubTab('class-subjects')}
              className={`px-3 py-2 rounded-lg transition cursor-pointer flex items-center space-x-1.5 ${
                activeSubTab === 'class-subjects' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-300 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Môn học theo lớp</span>
            </button>
            <button
              onClick={() => setActiveSubTab('subjects')}
              className={`px-3 py-2 rounded-lg transition cursor-pointer flex items-center space-x-1.5 ${
                activeSubTab === 'subjects' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-300 hover:text-white'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Danh mục môn ({subjects.length})</span>
            </button>
            <button
              onClick={() => setActiveSubTab('preview')}
              className={`px-3 py-2 rounded-lg transition cursor-pointer flex items-center space-x-1.5 ${
                activeSubTab === 'preview' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-300 hover:text-white'
              }`}
            >
              <DoorOpen className="w-3.5 h-3.5" />
              <span>Xem phòng đã xếp ({rooms.length})</span>
            </button>
          </div>
        </div>

        {successToast && (
          <div className="mt-4 p-3 bg-emerald-500/20 border border-emerald-400/40 rounded-xl text-xs text-emerald-200 flex items-center space-x-2 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{successToast}</span>
          </div>
        )}
      </div>

      {/* SUBTAB 1: PHÂN PHÒNG THỦ CÔNG (Multi-subject selection supported) */}
      {activeSubTab === 'manual-rooms' && (
        <div className="space-y-6">
          {/* Step 1: Chọn Khối học */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-1.5">
                <GraduationCap className="w-4 h-4 text-blue-600" />
                <span>1. Chọn Khối học (Lấy từ cột Khoi trong file import)</span>
              </label>
              <span className="text-[11px] text-slate-400">
                Đang có {dynamicGrades.length} khối học trong hệ thống
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              {dynamicGrades.map((grade) => {
                const gradeCount = students.filter((s) => (s.khoi || '').trim() === grade.trim()).length;
                const isSelected = selectedGrade === grade;
                return (
                  <button
                    key={grade}
                    type="button"
                    onClick={() => setSelectedGrade(grade)}
                    className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center space-x-2 transition cursor-pointer ${
                      isSelected
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20 ring-2 ring-blue-500/30'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                    }`}
                  >
                    <span>Khối {grade}</span>
                    <span className={`text-[11px] px-2 py-0.5 rounded-md font-semibold ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-white text-slate-600'
                    }`}>
                      {gradeCount} học sinh
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 2: Chọn Môn thi (Tích chọn một lúc nhiều môn) */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-1.5">
                  <BookOpen className="w-4 h-4 text-indigo-600" />
                  <span>2. Chọn Môn thi cần phân phòng (Tích chọn một lúc nhiều môn)</span>
                </label>
                <p className="text-xs text-slate-500 mt-0.5">
                  Cấu hình số phòng và sĩ số sẽ được áp dụng đồng loạt và lưu trên Firebase cho tất cả các môn được tích chọn dưới đây.
                </p>
              </div>

              {/* Status & Quick Action Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs bg-indigo-50 text-indigo-800 border border-indigo-200 px-3 py-1.5 rounded-lg font-semibold flex items-center space-x-1">
                  <CheckCheck className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Đã chọn: <strong>{selectedSubjectIds.length}</strong> / {gradeSubjects.length} môn</span>
                </span>
                <button
                  type="button"
                  onClick={handleSelectAllSubjects}
                  className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded-lg transition cursor-pointer"
                >
                  Chọn tất cả
                </button>
                <button
                  type="button"
                  onClick={handleDeselectAllSubjects}
                  className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold rounded-lg transition cursor-pointer"
                >
                  Bỏ chọn
                </button>
              </div>
            </div>

            {/* Quick Combinations */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="font-semibold text-slate-500">Tổ hợp nhanh:</span>
              <button
                type="button"
                onClick={() => handleSelectSubjectPreset('khtn')}
                className="px-2.5 py-1 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 font-medium rounded-md border border-slate-200 transition cursor-pointer"
              >
                🧪 Tổ hợp Tự nhiên (KHTN)
              </button>
              <button
                type="button"
                onClick={() => handleSelectSubjectPreset('khxh')}
                className="px-2.5 py-1 bg-slate-100 hover:bg-amber-50 hover:text-amber-700 text-slate-700 font-medium rounded-md border border-slate-200 transition cursor-pointer"
              >
                📚 Tổ hợp Xã hội (KHXH)
              </button>
              <button
                type="button"
                onClick={() => handleSelectSubjectPreset('core')}
                className="px-2.5 py-1 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 font-medium rounded-md border border-slate-200 transition cursor-pointer"
              >
                ⭐ 3 môn chung (Toán, Văn, Anh)
              </button>
            </div>

            {/* Subjects Checkbox Grid */}
            {gradeSubjects.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-xl text-slate-400 text-xs">
                Chưa có môn thi nào được khai báo cho Khối {selectedGrade}. Vui lòng chuyển sang tab <strong>"Danh mục môn"</strong> để thêm môn thi.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 pt-1">
                {gradeSubjects.map((sub) => {
                  const isChecked = selectedSubjectIds.includes(sub.id);
                  const count = getSubjectStudentCount(sub.id);

                  return (
                    <label
                      key={sub.id}
                      onClick={() => handleToggleSubject(sub.id)}
                      className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition select-none ${
                        isChecked
                          ? 'bg-blue-50/80 border-blue-400 ring-1 ring-blue-400/40 text-blue-950 shadow-2xs'
                          : 'bg-slate-50/60 border-slate-200 hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5 truncate mr-2">
                        <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition ${
                          isChecked ? 'bg-blue-600 text-white' : 'border border-slate-300 bg-white'
                        }`}>
                          {isChecked && <CheckSquare className="w-4 h-4" />}
                        </div>
                        <div className="truncate">
                          <div className="font-bold text-xs truncate">{sub.name}</div>
                          <div className="text-[10px] text-slate-400 font-mono">Mã: {sub.code}</div>
                        </div>
                      </div>

                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md shrink-0 ${
                        isChecked ? 'bg-blue-200/60 text-blue-900 font-bold' : 'bg-slate-200/60 text-slate-600'
                      }`}>
                        {count} hs
                      </span>
                    </label>
                  );
                })}
              </div>
            )}

            {/* Option to apply to grade default template */}
            <div className="pt-2 flex items-center justify-between text-xs">
              <label className="flex items-center space-x-2 cursor-pointer select-none text-slate-700 font-medium">
                <input
                  type="checkbox"
                  checked={applyToGradeDefault}
                  onChange={(e) => setApplyToGradeDefault(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                />
                <span>Đồng thời lưu làm mẫu phân phòng mặc định cho toàn bộ Khối {selectedGrade}</span>
              </label>

              <span className="text-[11px] text-emerald-600 flex items-center space-x-1 font-semibold">
                <CloudCheck className="w-4 h-4" />
                <span>Tự động đồng bộ và lưu trên Firebase Firestore</span>
              </span>
            </div>
          </div>

          {/* Step 3: Nhập số phòng & Công cụ phân bổ nhanh */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-100">
              {/* Room Count Input */}
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                  <Calculator className="w-5 h-5" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                    3. Nhập số lượng phòng thi:
                  </label>
                  <p className="text-[11px] text-slate-500">
                    Khi thay đổi, hệ thống sẽ tự động hiển thị phòng thi (bắt đầu từ P1, P2...) để nhập số học sinh.
                  </p>
                </div>
              </div>

              {/* Counter Input & Stepper */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => handleRoomCountChange(currentPlan.rooms.length - 1)}
                    disabled={currentPlan.rooms.length <= 1}
                    className="w-8 h-8 rounded-lg bg-white hover:bg-slate-200 disabled:opacity-40 text-slate-700 font-bold flex items-center justify-center transition shadow-2xs cursor-pointer"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={currentPlan.rooms.length}
                    onChange={(e) => handleRoomCountChange(parseInt(e.target.value, 10))}
                    className="w-16 px-2 py-1 bg-transparent text-center font-black text-blue-700 text-base focus:outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={() => handleRoomCountChange(currentPlan.rooms.length + 1)}
                    disabled={currentPlan.rooms.length >= 50}
                    className="w-8 h-8 rounded-lg bg-white hover:bg-slate-200 disabled:opacity-40 text-slate-700 font-bold flex items-center justify-center transition shadow-2xs cursor-pointer"
                  >
                    +
                  </button>
                </div>

                <div className="flex space-x-1 text-xs">
                  {[2, 3, 4, 5, 6, 8, 10].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => handleRoomCountChange(num)}
                      className={`px-2.5 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                        currentPlan.rooms.length === num
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                      }`}
                    >
                      {num} phòng
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Smart Quick Tools Toolbar */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-slate-700 flex items-center space-x-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Công cụ điền nhanh:</span>
                </span>
                <button
                  type="button"
                  onClick={handleQuickDistributeEvenly}
                  className="px-3 py-1.5 bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-300 text-slate-700 hover:text-blue-700 text-xs font-semibold rounded-lg transition shadow-2xs flex items-center space-x-1 cursor-pointer"
                  title="Chia đều tổng số học sinh cho các phòng"
                >
                  <Equal className="w-3.5 h-3.5 text-blue-600" />
                  <span>Chia đều học sinh ({Math.floor(totalEligibleCount / currentPlan.rooms.length)} em/phòng)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickFillStandard(24)}
                  className="px-3 py-1.5 bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 text-slate-700 hover:text-emerald-700 text-xs font-semibold rounded-lg transition shadow-2xs cursor-pointer"
                >
                  <span>Chuẩn 24 em/phòng</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickFillStandard(30)}
                  className="px-3 py-1.5 bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 text-slate-700 hover:text-indigo-700 text-xs font-semibold rounded-lg transition shadow-2xs cursor-pointer"
                >
                  <span>Chuẩn 30 em/phòng</span>
                </button>
                <button
                  type="button"
                  onClick={handleQuickBalanceLastRoom}
                  className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-semibold rounded-lg transition border border-amber-200 cursor-pointer"
                  title="Tự động tính số học sinh còn lại vào phòng cuối để khớp 100%"
                >
                  <span>Tự động cân bằng phòng cuối (P{currentPlan.rooms.length})</span>
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSavePlan(currentPlan, `Đã lưu phân phòng cho ${selectedSubjectIds.length} môn lên Firebase!`)}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition shadow-xs flex items-center space-x-1.5 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Lưu cho {selectedSubjectIds.length} môn (Firebase)</span>
                </button>
                <button
                  type="button"
                  onClick={handleOpenCopyGradeModal}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-lg transition cursor-pointer"
                >
                  <span>Sao chép sang Khối khác...</span>
                </button>
              </div>
            </div>

            {/* Real-time Scientific Balance Status Bar */}
            <div className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
              seatDifference === 0
                ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                : seatDifference < 0
                ? 'bg-amber-50 border-amber-300 text-amber-900'
                : 'bg-purple-50 border-purple-300 text-purple-900'
            }`}>
              <div className="flex items-center space-x-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold ${
                  seatDifference === 0 ? 'bg-emerald-600 text-white' : seatDifference < 0 ? 'bg-amber-600 text-white' : 'bg-purple-600 text-white'
                }`}>
                  {seatDifference === 0 ? <Check className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                </div>
                <div>
                  <div className="font-bold text-xs sm:text-sm">
                    {seatDifference === 0 ? (
                      <span>✅ Phân bổ chính xác 100%: {totalAllocatedSeats} / {totalEligibleCount} học sinh</span>
                    ) : seatDifference < 0 ? (
                      <span>⚠️ Thiếu {Math.abs(seatDifference)} chỗ ngồi (Đã xếp {totalAllocatedSeats} / {totalEligibleCount} học sinh)</span>
                    ) : (
                      <span>ℹ️ Dư {seatDifference} chỗ ngồi (Tổng xếp {totalAllocatedSeats} / {totalEligibleCount} học sinh thực tế)</span>
                    )}
                  </div>
                  <div className="text-[11px] opacity-80">
                    Đang áp dụng cho <strong>{selectedSubjectIds.length}</strong> môn học thuộc Khối {selectedGrade}. Dữ liệu được lưu trữ và đồng bộ hóa trực tiếp trên Firebase.
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2 text-xs font-mono font-bold shrink-0">
                <span className="bg-white/80 px-2.5 py-1 rounded-md border">
                  Cần xếp: {totalEligibleCount} hs
                </span>
                <span className="bg-white/80 px-2.5 py-1 rounded-md border">
                  Đã chia: {totalAllocatedSeats} hs
                </span>
              </div>
            </div>

            {/* Step 4: Room Cards Grid (P1, P2, ..., PN) */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-slate-900 text-sm flex items-center space-x-2">
                  <DoorOpen className="w-4 h-4 text-blue-600" />
                  <span>Danh sách {currentPlan.rooms.length} phòng thi (Bắt đầu từ P1):</span>
                </h3>
                <span className="text-xs text-slate-400">
                  Nhập số học sinh và địa điểm cho từng phòng
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {currentPlan.rooms.map((room, idx) => {
                  let prevSum = 0;
                  for (let i = 0; i < idx; i++) {
                    prevSum += Number(currentPlan.rooms[i].capacity) || 0;
                  }
                  const startStIndex = prevSum + 1;
                  const endStIndex = Math.min(totalEligibleCount, prevSum + (Number(room.capacity) || 0));
                  const hasStudents = totalEligibleCount > 0 && startStIndex <= totalEligibleCount;

                  return (
                    <div
                      key={room.roomNumber}
                      className="bg-slate-50/70 border border-slate-200 hover:border-blue-300 rounded-2xl p-4 space-y-3 transition shadow-2xs hover:shadow-sm"
                    >
                      {/* Room Header */}
                      <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                        <div className="flex items-center space-x-2">
                          <span className="w-8 h-8 rounded-xl bg-blue-600 text-white font-black text-xs flex items-center justify-center shadow-xs">
                            {room.roomCode}
                          </span>
                          <div>
                            <div className="font-bold text-xs text-slate-900">
                              Phòng thi {room.roomCode}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              Thứ tự: #{room.roomNumber}
                            </div>
                          </div>
                        </div>

                        <span className="text-[11px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-md">
                          Khối {selectedGrade}
                        </span>
                      </div>

                      {/* Number of Students input */}
                      <div className="space-y-1">
                        <label className="block text-[11px] font-bold text-slate-700">
                          Số học sinh trong phòng:
                        </label>
                        <div className="flex items-center space-x-2">
                          <button
                            type="button"
                            onClick={() => handleRoomCapacityChange(idx, (Number(room.capacity) || 0) - 1)}
                            disabled={(Number(room.capacity) || 0) <= 0}
                            className="w-8 h-8 rounded-lg bg-white hover:bg-slate-200 disabled:opacity-40 text-slate-700 font-bold border border-slate-200 flex items-center justify-center transition cursor-pointer"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min="0"
                            max="80"
                            value={room.capacity}
                            onChange={(e) => handleRoomCapacityChange(idx, parseInt(e.target.value, 10))}
                            className="flex-1 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-center font-bold text-slate-900 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                          />
                          <button
                            type="button"
                            onClick={() => handleRoomCapacityChange(idx, (Number(room.capacity) || 0) + 1)}
                            className="w-8 h-8 rounded-lg bg-white hover:bg-slate-200 text-slate-700 font-bold border border-slate-200 flex items-center justify-center transition cursor-pointer"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      {/* Location input */}
                      <div className="space-y-1">
                        <label className="block text-[11px] font-semibold text-slate-600">
                          Địa điểm / Ghi chú phòng:
                        </label>
                        <input
                          type="text"
                          value={room.location || ''}
                          onChange={(e) => handleRoomLocationChange(idx, e.target.value)}
                          placeholder={`VD: Phòng ${room.roomNumber} (Lớp ${selectedGrade}A${room.roomNumber})`}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                        />
                      </div>

                      {/* Estimated Range */}
                      <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">Dải thí sinh:</span>
                        {hasStudents ? (
                          <span className="font-mono font-bold text-blue-700">
                            STT #{startStIndex} &rarr; #{endStIndex} ({Math.max(0, endStIndex - startStIndex + 1)} em)
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Chưa có học sinh</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Sorting Rules */}
            <div className="pt-4 border-t border-slate-200">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
                Quy tắc sắp xếp thí sinh vào các phòng
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => handleSortChange('soBD')}
                  className={`p-4 rounded-xl border text-left transition cursor-pointer ${
                    config.sortBy === 'soBD'
                      ? 'border-blue-600 bg-blue-50/60 ring-2 ring-blue-500/20'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="font-bold text-sm text-slate-900">Theo Số báo danh (SoBD)</div>
                  <div className="text-xs text-slate-500 mt-1">
                    Thứ tự tăng dần theo SBD (12001, 12002...)
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleSortChange('ten')}
                  className={`p-4 rounded-xl border text-left transition cursor-pointer ${
                    config.sortBy === 'ten'
                      ? 'border-blue-600 bg-blue-50/60 ring-2 ring-blue-500/20'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="font-bold text-sm text-slate-900">Theo Tên (A - Z Tiếng Việt)</div>
                  <div className="text-xs text-slate-500 mt-1">
                    Xếp theo tên chính &rarr; họ lót (An, Bình, Cường...)
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleSortChange('lop')}
                  className={`p-4 rounded-xl border text-left transition cursor-pointer ${
                    config.sortBy === 'lop'
                      ? 'border-blue-600 bg-blue-50/60 ring-2 ring-blue-500/20'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="font-bold text-sm text-slate-900">Theo Lớp & Thứ tự</div>
                  <div className="text-xs text-slate-500 mt-1">
                    Gom từng lớp lại và chia phòng theo lớp
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 2: CLASS-SUBJECT ASSIGNMENT */}
      {activeSubTab === 'class-subjects' && (
        <div className="space-y-6">
          {/* Top Control Bar */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Thiết Lập Môn Học Theo Lớp</h3>
                <p className="text-xs text-slate-500">
                  Tùy chỉnh môn kiểm tra theo từng lớp (Tổ hợp KHTN, KHXH, Ban cơ bản, v.v.)
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Grade Filter */}
              <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setClassGradeFilter('all')}
                  className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                    classGradeFilter === 'all' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Tất cả ({allClasses.length})
                </button>
                {dynamicGrades.map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setClassGradeFilter(g)}
                    className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                      classGradeFilter === g ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600'
                    }`}
                  >
                    Khối {g}
                  </button>
                ))}
              </div>

              {/* View Mode Toggle */}
              <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setClassViewMode('detailed')}
                  className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center space-x-1 ${
                    classViewMode === 'detailed' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  <ListFilter className="w-3.5 h-3.5" />
                  <span>Chi tiết</span>
                </button>
                <button
                  type="button"
                  onClick={() => setClassViewMode('matrix')}
                  className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center space-x-1 ${
                    classViewMode === 'matrix' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  <Grid className="w-3.5 h-3.5" />
                  <span>Ma trận tổng hợp</span>
                </button>
              </div>
            </div>
          </div>

          {/* Validation alerts if subjects or classes are missing */}
          {subjects.length === 0 && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-800 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                <span>
                  Chưa có môn thi nào trong danh mục. Hãy chuyển sang tab <strong>"Danh mục môn"</strong> để thêm các môn thi trước!
                </span>
              </div>
              <button
                type="button"
                onClick={() => setActiveSubTab('subjects')}
                className="px-3 py-1.5 bg-amber-600 text-white font-bold rounded-lg hover:bg-amber-700 transition cursor-pointer"
              >
                Thêm môn ngay
              </button>
            </div>
          )}

          {/* Detailed Mode */}
          {classViewMode === 'detailed' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column: Classes Selector & Add Class */}
              <div className="space-y-4">
                <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Danh sách Lớp học ({filteredClasses.length})
                    </span>
                    <span className="text-[11px] text-slate-400">Chọn lớp để cấu hình</span>
                  </div>

                  {filteredClasses.length === 0 ? (
                    <div className="p-6 text-center text-slate-400 text-xs">
                      Chưa có lớp nào thuộc bộ lọc.
                    </div>
                  ) : (
                    <div className="space-y-1.5 max-h-[420px] overflow-y-auto pr-1">
                      {filteredClasses.map((cls) => {
                        const assignedCount = getAssignedSubjectIds(cls).length;
                        const isSelected = cls === currentActiveClassName;
                        const studentCount = students.filter((s) => s.lop === cls).length;

                        return (
                          <button
                            key={cls}
                            type="button"
                            onClick={() => setSelectedClassName(cls)}
                            className={`w-full p-3 rounded-xl flex items-center justify-between text-left transition cursor-pointer ${
                              isSelected
                                ? 'bg-blue-600 text-white shadow-md'
                                : 'bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-200/70'
                            }`}
                          >
                            <div className="flex items-center space-x-2.5">
                              <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                                isSelected ? 'bg-white/20 text-white' : 'bg-white text-blue-700 border border-slate-200'
                              }`}>
                                {cls}
                              </span>
                              <div>
                                <div className="font-bold text-xs">{cls}</div>
                                <div className={`text-[11px] ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}>
                                  {studentCount > 0 ? `${studentCount} học sinh` : 'Lớp tùy chỉnh'}
                                </div>
                              </div>
                            </div>

                            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                              isSelected
                                ? 'bg-white/20 text-white'
                                : assignedCount > 0
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}>
                              {assignedCount} môn
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Add Custom Class Form */}
                  <form onSubmit={handleAddCustomClass} className="pt-3 border-t border-slate-100 flex gap-2">
                    <input
                      type="text"
                      value={newCustomClassName}
                      onChange={(e) => setNewCustomClassName(e.target.value)}
                      placeholder="Thêm lớp (VD: 12A3)"
                      className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold uppercase focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                    <button
                      type="submit"
                      disabled={!newCustomClassName.trim()}
                      className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition cursor-pointer"
                    >
                      Thêm
                    </button>
                  </form>
                </div>
              </div>

              {/* Right Column: Subject Checklist & Quick Presets for Selected Class */}
              <div className="lg:col-span-2 space-y-4">
                {currentActiveClassName ? (
                  <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-6">
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="bg-blue-100 text-blue-800 font-black text-sm px-2.5 py-1 rounded-lg">
                            {currentActiveClassName}
                          </span>
                          <h3 className="font-bold text-slate-900 text-base">
                            Cấu hình danh sách môn thi
                          </h3>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          Đang chọn: <strong>{getAssignedSubjectIds(currentActiveClassName).length}</strong> / {subjects.length} môn thi
                        </p>
                      </div>

                      {/* Action buttons */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenCopyModal(currentActiveClassName)}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition flex items-center space-x-1 cursor-pointer"
                          title="Sao chép cấu hình môn sang các lớp khác"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          <span>Sao chép sang lớp khác...</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleApplyToEntireGrade(currentActiveClassName)}
                          className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-lg transition cursor-pointer"
                          title="Áp dụng cấu hình này cho mọi lớp trong cùng khối"
                        >
                          Áp dụng toàn Khối
                        </button>
                      </div>
                    </div>

                    {/* Quick Presets */}
                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
                      <div className="text-xs font-bold text-slate-700 flex items-center space-x-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                        <span>Mẫu tổ hợp nhanh:</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => handleApplyPreset(currentActiveClassName, 'khtn')}
                          className="px-2.5 py-1 bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-300 text-slate-700 hover:text-blue-700 text-xs font-medium rounded-lg transition cursor-pointer shadow-2xs"
                        >
                          🧪 Tổ hợp Tự nhiên (KHTN)
                        </button>
                        <button
                          type="button"
                          onClick={() => handleApplyPreset(currentActiveClassName, 'khxh')}
                          className="px-2.5 py-1 bg-white hover:bg-amber-50 border border-slate-200 hover:border-amber-300 text-slate-700 hover:text-amber-700 text-xs font-medium rounded-lg transition cursor-pointer shadow-2xs"
                        >
                          📚 Tổ hợp Xã hội (KHXH)
                        </button>
                        <button
                          type="button"
                          onClick={() => handleApplyPreset(currentActiveClassName, 'core')}
                          className="px-2.5 py-1 bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 text-slate-700 hover:text-indigo-700 text-xs font-medium rounded-lg transition cursor-pointer shadow-2xs"
                        >
                          ⭐ 3 môn chung (Toán, Văn, Anh)
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSelectAllForClass(currentActiveClassName)}
                          className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded-lg transition cursor-pointer"
                        >
                          Chọn tất cả ({subjects.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => handleClearAllForClass(currentActiveClassName)}
                          className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold rounded-lg transition cursor-pointer"
                        >
                          Bỏ chọn tất cả
                        </button>
                      </div>
                    </div>

                    {/* Subjects Grid */}
                    {subjects.length === 0 ? (
                      <div className="text-center py-8 text-slate-400 text-xs">
                        Chưa có môn thi nào trong hệ thống. Hãy thêm môn thi ở tab Danh mục môn.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {subjects.map((sub) => {
                          const assignedIds = getAssignedSubjectIds(currentActiveClassName);
                          const isAssigned = assignedIds.includes(sub.id);

                          return (
                            <label
                              key={sub.id}
                              onClick={() => handleToggleSubjectForClass(currentActiveClassName, sub.id)}
                              className={`p-3.5 rounded-xl border flex items-center justify-between cursor-pointer transition select-none ${
                                isAssigned
                                  ? 'bg-blue-50/70 border-blue-400 ring-1 ring-blue-400/40 text-blue-950'
                                  : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                              }`}
                            >
                              <div className="flex items-center space-x-3">
                                <div className={`w-5 h-5 rounded-md flex items-center justify-center transition ${
                                  isAssigned ? 'bg-blue-600 text-white' : 'border border-slate-300 bg-white'
                                }`}>
                                  {isAssigned && <CheckSquare className="w-4 h-4" />}
                                </div>
                                <div>
                                  <div className="font-bold text-xs sm:text-sm">{sub.name}</div>
                                  <div className="text-[11px] text-slate-400 font-mono">Mã: {sub.code}</div>
                                </div>
                              </div>

                              <div className="flex space-x-1">
                                {sub.grades.map((g) => (
                                  <span
                                    key={g}
                                    className="text-[10px] font-bold px-1.5 py-0.5 rounded-sm bg-slate-100 text-slate-600"
                                  >
                                    K{g}
                                  </span>
                                ))}
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl p-12 text-center text-slate-400 border border-slate-200">
                    <p className="font-semibold text-slate-700">Chưa chọn lớp học</p>
                    <p className="text-xs mt-1">Hãy chọn hoặc thêm một lớp ở cột bên trái.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Matrix Overview Mode */}
          {classViewMode === 'matrix' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Ma Trận Tổng Hợp: Môn Thi Theo Lớp</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Nhấp trực tiếp vào ô vuông để bật/tắt môn thi cho từng lớp. Thay đổi được lưu và đồng bộ tức thì lên Firebase.
                  </p>
                </div>
                <div className="flex items-center space-x-2 text-xs">
                  <span className="inline-flex items-center space-x-1 text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md font-semibold">
                    <CheckSquare className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Có học</span>
                  </span>
                  <span className="inline-flex items-center space-x-1 text-slate-500 bg-slate-100 px-2 py-1 rounded-md font-semibold">
                    <Square className="w-3.5 h-3.5 text-slate-400" />
                    <span>Không học</span>
                  </span>
                </div>
              </div>

              {allClasses.length === 0 || subjects.length === 0 ? (
                <div className="p-12 text-center text-slate-400">
                  <Grid className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                  <p className="font-semibold text-slate-700 text-sm">Chưa đủ dữ liệu hiển thị ma trận</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Cần có ít nhất 1 lớp học và 1 môn thi để lập bảng ma trận.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto max-h-[550px]">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0 z-10 shadow-xs">
                      <tr>
                        <th className="py-3 px-4 sticky left-0 bg-slate-100 z-20 border-r border-b border-slate-200 min-w-[120px]">
                          Lớp / Khối
                        </th>
                        <th className="py-3 px-3 text-center border-b border-slate-200 min-w-[90px]">
                          Tổng môn
                        </th>
                        {subjects.map((sub) => (
                          <th
                            key={sub.id}
                            className="py-3 px-3 text-center border-b border-slate-200 min-w-[100px] whitespace-nowrap"
                          >
                            <div>{sub.name}</div>
                            <div className="text-[10px] text-slate-400 font-mono font-normal">
                              {sub.code}
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredClasses.map((cls) => {
                        const assignedIds = getAssignedSubjectIds(cls);
                        const studentCount = students.filter((s) => s.lop === cls).length;

                        return (
                          <tr key={cls} className="hover:bg-blue-50/30 transition">
                            <td className="py-2.5 px-4 font-bold text-slate-900 sticky left-0 bg-white hover:bg-blue-50/30 border-r border-slate-100 z-10">
                              <div className="flex items-center space-x-2">
                                <span className="w-6 h-6 rounded-md bg-blue-100 text-blue-800 flex items-center justify-center text-xs font-bold">
                                  {cls}
                                </span>
                                <div>
                                  <div className="font-bold">{cls}</div>
                                  <div className="text-[10px] text-slate-400 font-normal">
                                    {studentCount > 0 ? `${studentCount} hs` : 'Tùy chỉnh'}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-center font-bold">
                              <span
                                className={`inline-block px-2 py-0.5 rounded-full text-[11px] ${
                                  assignedIds.length > 0
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {assignedIds.length} / {subjects.length}
                              </span>
                            </td>
                            {subjects.map((sub) => {
                              const isChecked = assignedIds.includes(sub.id);
                              return (
                                <td
                                  key={sub.id}
                                  onClick={() => handleToggleSubjectForClass(cls, sub.id)}
                                  className={`py-2 px-3 text-center cursor-pointer transition border-l border-slate-50 hover:bg-blue-100/50 ${
                                    isChecked ? 'bg-blue-50/40' : ''
                                  }`}
                                >
                                  <div className="flex items-center justify-center">
                                    {isChecked ? (
                                      <span className="w-6 h-6 rounded-md bg-blue-600 text-white flex items-center justify-center shadow-xs">
                                        <CheckSquare className="w-4 h-4" />
                                      </span>
                                    ) : (
                                      <span className="w-6 h-6 rounded-md border border-slate-200 bg-white flex items-center justify-center text-transparent hover:border-slate-400">
                                        <Square className="w-3.5 h-3.5 text-slate-200" />
                                      </span>
                                    )}
                                  </div>
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 3: SUBJECTS CATALOG */}
      {activeSubTab === 'subjects' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Add Subject Card */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <Plus className="w-5 h-5 text-blue-600" />
                <span>Thêm môn thi mới</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Khai báo danh mục môn thi để sử dụng khi lập Thời khóa biểu và phân môn theo lớp.
              </p>
            </div>

            <form onSubmit={handleAddSubject} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tên môn thi <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={newSubjectName}
                  onChange={(e) => setNewSubjectName(e.target.value)}
                  placeholder="VD: Toán, Ngữ Văn, Tiếng Anh..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mã viết tắt môn (tùy chọn)
                </label>
                <input
                  type="text"
                  value={newSubjectCode}
                  onChange={(e) => setNewSubjectCode(e.target.value)}
                  placeholder="VD: TOAN, VAN, ANH..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-mono uppercase focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  Áp dụng cho Khối học
                </label>
                <div className="flex flex-wrap gap-2">
                  {dynamicGrades.map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => toggleGradeForSubject(g)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                        newSubjectGrades.includes(g)
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Khối {g}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={!newSubjectName.trim()}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-xs py-2.5 rounded-xl transition shadow-xs cursor-pointer"
              >
                Lưu môn thi vào danh mục
              </button>
            </form>
          </div>

          {/* Subjects List */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm flex items-center space-x-2">
                <BookOpen className="w-4 h-4 text-blue-600" />
                <span>Danh mục môn thi hiện có ({subjects.length} môn)</span>
              </h3>
              <span className="text-xs text-slate-400">Đồng bộ Firebase thời gian thực</span>
            </div>

            {subjects.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <BookOpen className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                <p className="font-semibold text-slate-700 text-sm">Chưa có môn thi nào</p>
                <p className="text-xs text-slate-400 mt-1">
                  Hãy nhập tên môn thi ở cột bên trái để bắt đầu tạo danh mục.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {subjects.map((sub, idx) => (
                  <div
                    key={sub.id}
                    className="p-4 flex items-center justify-between hover:bg-slate-50 transition"
                  >
                    <div className="flex items-center space-x-3">
                      <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-800 font-bold text-xs flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <div>
                        <div className="font-bold text-sm text-slate-900">{sub.name}</div>
                        <div className="text-xs text-slate-400 font-mono">Mã: {sub.code}</div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <div className="flex space-x-1">
                        {sub.grades.map((g) => (
                          <span
                            key={g}
                            className="bg-slate-100 text-slate-700 text-[11px] font-bold px-2 py-0.5 rounded-md"
                          >
                            Khối {g}
                          </span>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={() => setSubjectToDelete(sub)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                        title="Xóa môn thi"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUBTAB 4: PREVIEW ROOMS */}
      {activeSubTab === 'preview' && (
        <div className="space-y-6">
          {rooms.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center text-slate-400 border border-slate-200">
              <DoorOpen className="w-12 h-12 mx-auto text-slate-300 mb-3" />
              <p className="text-base font-bold text-slate-700">Chưa có phòng thi nào được tạo</p>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                Hiện tại chưa có danh sách học sinh. Vui lòng tải lên file Excel tại Menu 01 để hệ thống tự động phân chia phòng thi.
              </p>
              {onNavigateToStudents && (
                <button
                  type="button"
                  onClick={onNavigateToStudents}
                  className="mt-4 inline-flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2 rounded-xl transition cursor-pointer"
                >
                  <span>Chuyển sang Quản lý Học sinh</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {rooms.map((room) => {
                const firstSbd = room.students[0]?.soBD;
                const lastSbd = room.students[room.students.length - 1]?.soBD;
                return (
                  <div
                    key={`${room.grade}_${room.roomCode}`}
                    className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:border-blue-300 transition"
                  >
                    <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-100">
                      <div className="flex items-center space-x-2">
                        <span className="w-9 h-9 rounded-xl bg-blue-600 text-white font-black text-sm flex items-center justify-center shadow-xs">
                          {room.roomCode}
                        </span>
                        <div>
                          <div className="font-bold text-sm text-slate-900">
                            Phòng thi {room.roomCode}
                          </div>
                          <div className="text-xs font-semibold text-blue-600">
                            Khối {room.grade} &bull; {room.students.length} thí sinh
                          </div>
                        </div>
                      </div>
                      <span className="bg-slate-100 text-slate-700 text-[11px] font-bold px-2 py-0.5 rounded-md">
                        P{room.roomNumber}
                      </span>
                    </div>

                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Địa điểm:</span>
                        <span className="font-semibold text-slate-800">{room.location}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Dải SBD:</span>
                        <span className="font-mono font-bold text-blue-700">
                          {firstSbd} &rarr; {lastSbd}
                        </span>
                      </div>
                    </div>

                    {/* Sample 3 student names */}
                    <div className="mt-3 pt-3 border-t border-slate-100 space-y-1">
                      <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                        Thí sinh đại diện:
                      </div>
                      {room.students.slice(0, 3).map((st) => (
                        <div key={st.id} className="text-xs text-slate-700 truncate">
                          &bull; <span className="font-mono font-bold text-slate-900">{st.soBD}</span> - {st.hoTen} ({st.lop})
                        </div>
                      ))}
                      {room.students.length > 3 && (
                        <div className="text-[11px] text-blue-600 font-medium pt-1">
                          + {room.students.length - 3} học sinh khác...
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Confirmation Modal for Subject Deletion */}
      {subjectToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden border border-slate-200">
            <div className="p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Xác nhận xóa môn thi</h3>
              <p className="text-xs text-slate-600 mt-2">
                Bạn có chắc chắn muốn xóa môn <strong>"{subjectToDelete.name}"</strong>? Dữ liệu này sẽ được đồng bộ và cập nhật ngay lập tức trên Firebase.
              </p>
              <div className="mt-5 flex space-x-2 justify-center">
                <button
                  type="button"
                  onClick={() => setSubjectToDelete(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  onClick={executeDeleteSubject}
                  className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition shadow-md shadow-rose-600/20 cursor-pointer"
                >
                  Xác nhận xóa
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Copy Class-Subject Mapping Modal */}
      {isCopyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Copy className="w-5 h-5 text-blue-400" />
                <h3 className="font-bold text-base">Sao chép cấu hình môn</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCopyModalOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <p className="text-slate-600">
                Sao chép danh sách môn học của lớp <strong>"{copySourceClass}"</strong> ({getAssignedSubjectIds(copySourceClass).length} môn) sang các lớp được chọn dưới đây:
              </p>

              <div className="max-h-60 overflow-y-auto space-y-1.5 p-2 bg-slate-50 rounded-xl border border-slate-200">
                {allClasses
                  .filter((c) => c !== copySourceClass)
                  .map((cls) => {
                    const isChecked = copyTargetClasses.includes(cls);
                    return (
                      <label
                        key={cls}
                        className="flex items-center space-x-2.5 p-2 hover:bg-white rounded-lg cursor-pointer transition select-none"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            if (isChecked) {
                              setCopyTargetClasses(copyTargetClasses.filter((c) => c !== cls));
                            } else {
                              setCopyTargetClasses([...copyTargetClasses, cls]);
                            }
                          }}
                          className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                        />
                        <span className="font-bold text-slate-800">{cls}</span>
                        <span className="text-[11px] text-slate-400">
                          (Hiện có {getAssignedSubjectIds(cls).length} môn)
                        </span>
                      </label>
                    );
                  })}
              </div>

              <div className="flex justify-between items-center pt-2">
                <button
                  type="button"
                  onClick={() =>
                    setCopyTargetClasses(allClasses.filter((c) => c !== copySourceClass))
                  }
                  className="text-blue-600 hover:text-blue-800 font-semibold"
                >
                  Chọn tất cả
                </button>
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => setIsCopyModalOpen(false)}
                    className="px-4 py-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl font-semibold cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    onClick={handleExecuteCopy}
                    disabled={copyTargetClasses.length === 0}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-xs cursor-pointer"
                  >
                    Sao chép ({copyTargetClasses.length} lớp)
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Copy Grade Room Plan Modal */}
      {isCopyGradeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Copy className="w-5 h-5 text-blue-400" />
                <h3 className="font-bold text-base">Sao chép phân phòng sang Khối khác</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCopyGradeModalOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <p className="text-slate-600">
                Sao chép mô hình {currentPlan.rooms.length} phòng thi của <strong>Khối {selectedGrade}</strong> sang các Khối được chọn dưới đây (hệ thống sẽ tự động cân đối lại sĩ số theo số lượng học sinh thực tế của Khối đích và lưu Firebase):
              </p>

              <div className="max-h-60 overflow-y-auto space-y-1.5 p-2 bg-slate-50 rounded-xl border border-slate-200">
                {dynamicGrades
                  .filter((g) => g !== selectedGrade)
                  .map((g) => {
                    const isChecked = copyTargetGrades.includes(g);
                    const gradeCount = students.filter((s) => (s.khoi || '').trim() === g.trim()).length;
                    return (
                      <label
                        key={g}
                        className="flex items-center space-x-2.5 p-2 hover:bg-white rounded-lg cursor-pointer transition select-none"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            if (isChecked) {
                              setCopyTargetGrades(copyTargetGrades.filter((item) => item !== g));
                            } else {
                              setCopyTargetGrades([...copyTargetGrades, g]);
                            }
                          }}
                          className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                        />
                        <span className="font-bold text-slate-800">Khối {g}</span>
                        <span className="text-[11px] text-slate-400">
                          ({gradeCount} học sinh)
                        </span>
                      </label>
                    );
                  })}
              </div>

              <div className="flex justify-between items-center pt-2">
                <button
                  type="button"
                  onClick={() =>
                    setCopyTargetGrades(dynamicGrades.filter((g) => g !== selectedGrade))
                  }
                  className="text-blue-600 hover:text-blue-800 font-semibold"
                >
                  Chọn tất cả
                </button>
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => setIsCopyGradeModalOpen(false)}
                    className="px-4 py-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl font-semibold cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    onClick={handleExecuteCopyGrade}
                    disabled={copyTargetGrades.length === 0}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-xs cursor-pointer"
                  >
                    Sao chép ({copyTargetGrades.length} khối)
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
