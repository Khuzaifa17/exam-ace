import { Link } from 'react-router-dom';
import { ArrowRight, FileText, Clock, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

// Sample exam data - will be replaced with real data
const sampleExams = [
  {
    id: '1',
    slug: 'css',
    title: 'CSS (Central Superior Services)',
    description: 'Federal level civil services examination for prestigious positions.',
    questionCount: 5000,
    duration: '3 hours',
    students: 2500,
    tags: ['Federal', 'Competitive'],
    color: 'from-emerald-500 to-teal-600',
  },
  {
    id: '2',
    slug: 'pms',
    title: 'PMS (Provincial Management Service)',
    description: 'Provincial level civil services exam for administrative positions.',
    questionCount: 4000,
    duration: '3 hours',
    students: 3200,
    tags: ['Provincial', 'Competitive'],
    color: 'from-blue-500 to-indigo-600',
  },
  {
    id: '3',
    slug: 'ppsc',
    title: 'PPSC (Punjab Public Service)',
    description: 'Punjab province civil services and recruitment examinations.',
    questionCount: 6000,
    duration: '2 hours',
    students: 4100,
    tags: ['Punjab', 'Popular'],
    color: 'from-amber-500 to-orange-600',
  },
  {
    id: '4',
    slug: 'nts',
    title: 'NTS (National Testing Service)',
    description: 'Standardized testing for jobs, scholarships, and admissions.',
    questionCount: 8000,
    duration: '2 hours',
    students: 5500,
    tags: ['Jobs', 'Scholarships'],
    color: 'from-purple-500 to-pink-600',
  },
];

export const ExamsPreviewSection = () => {
  return (
    <section className="py-20">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-12">
          <div>
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
              Popular <span className="gradient-text">Exams</span>
            </h2>
            <p className="text-muted-foreground max-w-xl">
              Start preparing for Pakistan's most competitive exams with our comprehensive question banks.
            </p>
          </div>
          <Button variant="outline" asChild className="w-fit">
            <Link to="/exams" className="group">
              View All Exams
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </Button>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {sampleExams.map((exam, index) => (
            <Link
              key={exam.id}
              to={`/exam/${exam.slug}`}
              className="group glass-card overflow-hidden rounded-2xl hover:shadow-card-hover transition-all duration-300"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {/* Gradient header */}
              <div className={`h-2 bg-gradient-to-r ${exam.color}`} />
              
              <div className="p-6">
                <div className="flex flex-wrap gap-2 mb-3">
                  {exam.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>

                <h3 className="font-display text-xl font-semibold mb-2 group-hover:text-primary transition-colors">
                  {exam.title}
                </h3>
                <p className="text-muted-foreground text-sm mb-4">{exam.description}</p>

                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <FileText className="h-4 w-4" />
                    {exam.questionCount.toLocaleString()} MCQs
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {exam.duration}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    {exam.students.toLocaleString()} students
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};
