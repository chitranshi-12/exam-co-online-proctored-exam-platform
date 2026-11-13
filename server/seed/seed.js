import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Teacher } from '../models/Teacher.js';
import { Exam } from '../models/Exam.js';
import { Attempt } from '../models/Attempt.js';

dotenv.config();

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/examco';

async function seed() {
  try {
    await mongoose.connect(uri);
    console.log('Connected to database for seeding...');

    // Clear existing sample collections
    await Teacher.deleteMany({ email: 'e.vance@stanford.edu' });
    await Exam.deleteMany({ examCode: 'CS2026' });

    // 1. Create Sample Teacher
    const teacher = await Teacher.create({
      firebaseUid: 'seed_eleanor_vance_uid_2026',
      name: 'Dr. Eleanor Vance',
      email: 'e.vance@stanford.edu',
      photo: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Eleanor&backgroundColor=b6e3f4',
    });
    console.log(`Created Teacher: ${teacher.name} (${teacher.email})`);

    // 2. Create Sample Exam with 10 MCQs
    const exam = await Exam.create({
      teacherId: teacher._id,
      title: 'CS 101: Data Structures & Algorithms Comprehensive Final',
      institute: 'Stanford University Department of Computer Science',
      description: 'Strictly proctored assessment covering tree balancing, graph algorithms, and algorithmic complexity.',
      examCode: 'CS2026',
      durationMinutes: 45,
      requireFullscreen: true,
      shuffleQuestions: false,
      status: 'active',
      questions: [
        {
          text: 'What is the average case time complexity of searching in a Balanced Binary Search Tree (AVL Tree)?',
          options: ['O(1)', 'O(log N)', 'O(N)', 'O(N log N)'],
          correctIndex: 1,
          marks: 1,
        },
        {
          text: 'Which data structure follows the Last-In-First-Out (LIFO) operational principle?',
          options: ['Queue', 'Stack', 'Min-Heap', 'Circular Buffer'],
          correctIndex: 1,
          marks: 1,
        },
        {
          text: 'Which graph traversal algorithm uses a First-In-First-Out (FIFO) Queue to explore vertices?',
          options: ['Depth First Search (DFS)', 'Breadth First Search (BFS)', 'Topological Sort', 'Dijkstra with recursion'],
          correctIndex: 1,
          marks: 1,
        },
        {
          text: 'In worst-case scenarios with poor pivot selection, QuickSort exhibits which time complexity?',
          options: ['O(N log N)', 'O(N)', 'O(N²)', 'O(log N)'],
          correctIndex: 2,
          marks: 1,
        },
        {
          text: 'What is the primary advantage of a Doubly Linked List over a Singly Linked List?',
          options: [
            'Requires 50% less memory per node',
            'Direct constant-time O(1) traversal in both forward and backward directions',
            'Automatic cycle detection without Floyd algorithm',
            'Direct random index access in O(1)',
          ],
          correctIndex: 1,
          marks: 1,
        },
        {
          text: 'Which of the following sorting algorithms is guaranteed to be stable and operates in O(N log N) worst-case time?',
          options: ['Merge Sort', 'Heap Sort', 'Selection Sort', 'Shell Sort'],
          correctIndex: 0,
          marks: 1,
        },
        {
          text: 'What is the load factor α of a hash table with M buckets storing N entries?',
          options: ['α = M / N', 'α = N / M', 'α = N × M', 'α = log(N / M)'],
          correctIndex: 1,
          marks: 1,
        },
        {
          text: 'Which traversal of a Binary Search Tree produces values in strictly sorted ascending order?',
          options: ['Pre-order', 'In-order', 'Post-order', 'Level-order'],
          correctIndex: 1,
          marks: 1,
        },
        {
          text: 'What technique resolves hash collisions by storing multiple keys in a linked list at each bucket?',
          options: ['Open Addressing with Linear Probing', 'Separate Chaining', 'Double Hashing', 'Robin Hood Hashing'],
          correctIndex: 1,
          marks: 1,
        },
        {
          text: 'Dijkstra shortest path algorithm does NOT produce correct results when which condition is present?',
          options: ['Directed cyclic graphs', 'Dense edges with large degrees', 'Edges with negative weights', 'Disjoint graph components'],
          correctIndex: 2,
          marks: 1,
        },
      ],
    });
    console.log(`Created Exam: "${exam.title}" with ${exam.questions.length} questions. Exam Code: ${exam.examCode}`);

    console.log('✅ Seeding completed successfully.');
    process.exit(0);
  } catch (err) {
    console.error('Seeding error:', err);
    process.exit(1);
  }
}

seed();
