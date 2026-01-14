import { BookCheck, Clock, BarChart3, Bookmark, Target, Smartphone } from 'lucide-react';

const features = [
  {
    icon: BookCheck,
    title: 'Smart Practice Mode',
    description: 'Pick any topic and practice with instant feedback. Learn from explanations for every question.',
  },
  {
    icon: Clock,
    title: 'Timed Mock Tests',
    description: 'Simulate real exam conditions with timed tests. Random questions every attempt.',
  },
  {
    icon: BarChart3,
    title: 'Detailed Analytics',
    description: 'Track your progress with topic-wise breakdown, accuracy stats, and performance trends.',
  },
  {
    icon: Bookmark,
    title: 'Bookmarks & Review',
    description: 'Save important questions and review your mistakes to improve faster.',
  },
  {
    icon: Target,
    title: 'Exam-Focused Content',
    description: 'Questions curated from past papers and aligned with latest exam patterns.',
  },
  {
    icon: Smartphone,
    title: 'Mobile Friendly',
    description: 'Practice anywhere with our fully responsive design. Keyboard shortcuts for speed.',
  },
];

export const FeaturesSection = () => {
  return (
    <section className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
            Everything You Need to{' '}
            <span className="gradient-text">Succeed</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Built by exam toppers for future toppers. Every feature designed to maximize your preparation.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className="glass-card p-6 rounded-2xl hover:shadow-card-hover transition-all duration-300 group"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 text-primary mb-4 group-hover:scale-110 transition-transform">
                <feature.icon className="h-6 w-6" />
              </div>
              <h3 className="font-display text-lg font-semibold mb-2">{feature.title}</h3>
              <p className="text-muted-foreground text-sm">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
