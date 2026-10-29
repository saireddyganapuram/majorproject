import mongoose from 'mongoose';
import { config } from '../config/index.js';
import {
  User,
  Class,
  Enrollment,
  ClassroomSession,
  Attendance,
  EngagementRecord,
  ChatMessage,
  ConsentRecord,
} from '../models/index.js';

const seedDatabase = async () => {
  try {
    console.log('🌱 Connecting to database for seeding...');
    await mongoose.connect(config.mongoUri);
    console.log('✅ Connected to MongoDB');

    console.log('🧹 Clearing existing collections...');
    await Promise.all([
      User.deleteMany({}),
      Class.deleteMany({}),
      Enrollment.deleteMany({}),
      ClassroomSession.deleteMany({}),
      Attendance.deleteMany({}),
      EngagementRecord.deleteMany({}),
      ChatMessage.deleteMany({}),
      ConsentRecord.deleteMany({}),
    ]);

    console.log('👤 Creating users...');
    const admin = await User.create({
      name: 'System Admin',
      email: 'admin@classroom.ai',
      password: 'Admin@1234',
      role: 'admin',
      status: 'active',
    });

    const instructor = await User.create({
      name: 'Dr. Alan Turing',
      email: 'instructor@classroom.ai',
      password: 'Teacher@1234',
      role: 'instructor',
      status: 'active',
    });

    const student1 = await User.create({
      name: 'Ada Lovelace',
      email: 'student1@classroom.ai',
      password: 'Student@1234',
      role: 'student',
      status: 'active',
    });

    const student2 = await User.create({
      name: 'Grace Hopper',
      email: 'student2@classroom.ai',
      password: 'Student@1234',
      role: 'student',
      status: 'active',
    });

    const student3 = await User.create({
      name: 'Claude Shannon',
      email: 'student3@classroom.ai',
      password: 'Student@1234',
      role: 'student',
      status: 'active',
    });

    console.log('📚 Creating classes...');
    const class1 = await Class.create({
      name: 'CS-401: Computer Vision & Affective Computing',
      classCode: 'CV4010',
      description: 'Advanced computer vision techniques, face mesh analysis, head pose estimation, and attention modeling.',
      subject: 'Computer Science',
      instructor: instructor._id,
      enrollmentType: 'code',
      maxStudents: 60,
      status: 'active',
    });

    const class2 = await Class.create({
      name: 'CS-302: Real-time Distributed Systems',
      classCode: 'DS3020',
      description: 'High-throughput WebSockets, WebRTC signaling, and edge AI processing architectures.',
      subject: 'Computer Science',
      instructor: instructor._id,
      enrollmentType: 'code',
      maxStudents: 50,
      status: 'active',
    });

    console.log('📝 Creating enrollments...');
    await Enrollment.create([
      { classId: class1._id, studentId: student1._id, status: 'enrolled' },
      { classId: class1._id, studentId: student2._id, status: 'enrolled' },
      { classId: class1._id, studentId: student3._id, status: 'enrolled' },
      { classId: class2._id, studentId: student1._id, status: 'enrolled' },
      { classId: class2._id, studentId: student2._id, status: 'enrolled' },
    ]);

    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const tenMinsAgo = new Date(now.getTime() - 10 * 60 * 1000);

    console.log('🎯 Creating classroom sessions...');
    const completedSession = await ClassroomSession.create({
      classId: class1._id,
      instructor: instructor._id,
      instructorId: instructor._id,
      title: 'Session 1: Facial Landmark Geometries & Engagement Modeling',
      description: 'Deep dive into MediaPipe 468 landmark mesh, Head Pose Euler angles, and EAR proxies.',
      scheduledStart: oneHourAgo,
      scheduledEnd: tenMinsAgo,
      actualStart: oneHourAgo,
      actualEnd: tenMinsAgo,
      status: 'completed',
    });

    const activeSession = await ClassroomSession.create({
      classId: class1._id,
      instructor: instructor._id,
      instructorId: instructor._id,
      title: 'Session 2: Real-time Multi-Student Classroom Demo',
      description: 'Live interactive classroom session with simulated student streams and real-time engagement telemetry.',
      scheduledStart: now,
      scheduledEnd: new Date(now.getTime() + 50 * 60 * 1000),
      actualStart: now,
      status: 'active',
    });

    const upcomingSession = await ClassroomSession.create({
      classId: class2._id,
      instructor: instructor._id,
      instructorId: instructor._id,
      title: 'Session 1: WebRTC Mesh vs SFU Architectures',
      description: 'Comparative analysis of peer-to-peer WebRTC signaling topologies and latency.',
      scheduledStart: new Date(now.getTime() + 24 * 60 * 60 * 1000),
      scheduledEnd: new Date(now.getTime() + 25 * 60 * 60 * 1000),
      status: 'scheduled',
    });

    console.log('🛡️ Creating consent records...');
    const students = [student1, student2, student3];
    for (const s of students) {
      await ConsentRecord.create({
        studentId: s._id,
        sessionId: completedSession._id,
        analysisType: 'face_landmarks',
        granted: true,
      });
      await ConsentRecord.create({
        studentId: s._id,
        sessionId: activeSession._id,
        analysisType: 'face_landmarks',
        granted: true,
      });
    }

    console.log('⏱️ Creating attendance records...');
    await Attendance.create([
      {
        sessionId: completedSession._id,
        studentId: student1._id,
        status: 'present',
        totalDurationMinutes: 50,
        intervals: [{ joinTime: oneHourAgo, leaveTime: tenMinsAgo }],
      },
      {
        sessionId: completedSession._id,
        studentId: student2._id,
        status: 'present',
        totalDurationMinutes: 48,
        intervals: [{ joinTime: oneHourAgo, leaveTime: tenMinsAgo }],
      },
      {
        sessionId: completedSession._id,
        studentId: student3._id,
        status: 'present',
        totalDurationMinutes: 44,
        intervals: [{ joinTime: oneHourAgo, leaveTime: tenMinsAgo }],
      },
    ]);

    console.log('📈 Creating simulated engagement metrics for completed session...');
    const states = ['attentive', 'attentive', 'attentive', 'neutral', 'neutral', 'distracted'];
    const engagementRecords = [];

    // Generate 15 timeline points (every 3 minutes across 45 mins)
    for (let i = 0; i < 15; i++) {
      const pointTime = new Date(oneHourAgo.getTime() + i * 3 * 60 * 1000);

      // Student 1 (high performer: 82-95)
      const s1Score = Math.floor(82 + Math.random() * 14);
      engagementRecords.push({
        sessionId: completedSession._id,
        studentId: student1._id,
        overallScore: s1Score,
        facialState: s1Score > 85 ? 'attentive' : 'neutral',
        attentionScore: s1Score,
        headPoseState: 'facing_camera',
        eyeGazeScore: s1Score - 2,
        distractionFlag: false,
        timestamp: pointTime,
      });

      // Student 2 (moderate performer: 65-88)
      const s2Score = Math.floor(65 + Math.random() * 23);
      engagementRecords.push({
        sessionId: completedSession._id,
        studentId: student2._id,
        overallScore: s2Score,
        facialState: s2Score > 75 ? 'attentive' : 'neutral',
        attentionScore: s2Score,
        headPoseState: 'facing_camera',
        eyeGazeScore: s2Score,
        distractionFlag: false,
        timestamp: pointTime,
      });

      // Student 3 (occasional distraction dips: 45-80)
      const s3Distracted = i === 4 || i === 8 || i === 12;
      const s3Score = s3Distracted ? Math.floor(35 + Math.random() * 15) : Math.floor(70 + Math.random() * 15);
      engagementRecords.push({
        sessionId: completedSession._id,
        studentId: student3._id,
        overallScore: s3Score,
        facialState: s3Distracted ? 'distracted' : 'attentive',
        attentionScore: s3Score,
        headPoseState: s3Distracted ? 'looking_away' : 'facing_camera',
        eyeGazeScore: s3Score,
        distractionFlag: s3Distracted,
        timestamp: pointTime,
      });
    }

    await EngagementRecord.insertMany(engagementRecords);

    console.log('💬 Creating chat messages...');
    await ChatMessage.create([
      {
        sessionId: completedSession._id,
        sender: instructor._id,
        message: 'Welcome everyone! Today we examine 3D facial mesh vectors and privacy preservation.',
        status: 'visible',
      },
      {
        sessionId: completedSession._id,
        sender: student1._id,
        message: 'Does MediaPipe calculate the head pitch using the PnP perspective algorithm?',
        status: 'visible',
      },
      {
        sessionId: completedSession._id,
        sender: instructor._id,
        message: 'Yes Ada! OpenCV solvePnP maps 3D facial model points to 2D image coordinates.',
        status: 'visible',
      },
      {
        sessionId: completedSession._id,
        sender: student2._id,
        message: 'And raw video frames never get stored on the server, right?',
        status: 'visible',
      },
      {
        sessionId: completedSession._id,
        sender: instructor._id,
        message: 'Exactly! Only derived mathematical engagement metrics are persisted.',
        status: 'visible',
      },
    ]);

    console.log('🎉 Seeding successfully completed!');
    console.log('----------------------------------------------------');
    console.log('Default Accounts:');
    console.log('Admin:       admin@classroom.ai       / Admin@1234');
    console.log('Instructor:  instructor@classroom.ai  / Teacher@1234');
    console.log('Student 1:   student1@classroom.ai    / Student@1234');
    console.log('Student 2:   student2@classroom.ai    / Student@1234');
    console.log('Student 3:   student3@classroom.ai    / Student@1234');
    console.log('----------------------------------------------------');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
};

seedDatabase();
