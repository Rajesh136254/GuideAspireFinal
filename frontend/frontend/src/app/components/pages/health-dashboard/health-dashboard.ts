import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ApiService } from '../../../services/api.service';
import { Section, Class, Day } from '../../../models/models';

interface LinkStatus {
    url: string;
    status: 'checking' | 'working' | 'broken' | 'empty';
    statusCode?: number;
}

interface DayHealthStatus {
    dayNumber: number;
    topic: string;
    quizLink: LinkStatus;
    projectLink: LinkStatus;
    englishVideo: LinkStatus;
    teluguVideo: LinkStatus;
}

interface ClassHealthStatus {
    className: string;
    classId: number;
    days: DayHealthStatus[];
    totalDays: number;
    workingLinks: number;
    brokenLinks: number;
    emptyLinks: number;
    healthPercentage: number;
}

interface SectionHealthStatus {
    sectionName: string;
    sectionId: number;
    classes: ClassHealthStatus[];
    totalLinks: number;
    workingLinks: number;
    brokenLinks: number;
    emptyLinks: number;
    healthPercentage: number;
}

@Component({
    selector: 'app-health-dashboard',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './health-dashboard.html',
    styleUrls: ['./health-dashboard.css']
})
export class HealthDashboardComponent implements OnInit, OnDestroy {
    sections: SectionHealthStatus[] = [];
    isLoading = false;
    lastChecked: Date | null = null;
    autoRefreshInterval: any;
    selectedSection: number | null = null;
    selectedClass: number | null = null;

    // Overall statistics
    overallStats = {
        totalLinks: 0,
        workingLinks: 0,
        brokenLinks: 0,
        emptyLinks: 0,
        healthPercentage: 0
    };

    // Filter options
    filterStatus: 'all' | 'working' | 'broken' | 'empty' = 'all';
    searchQuery = '';

    // Progress tracking
    loadingMessage = 'Initializing...';
    currentProgress = 0;
    totalProgress = 0;

    constructor(
        private http: HttpClient,
        private apiService: ApiService,
        private cdr: ChangeDetectorRef
    ) { }

    ngOnInit(): void {
        this.loadHealthData();
        // Auto-refresh every 30 minutes (configurable cadence)
        this.autoRefreshInterval = setInterval(() => {
            this.loadHealthData();
        }, 30 * 60 * 1000);
    }

    ngOnDestroy(): void {
        if (this.autoRefreshInterval) {
            clearInterval(this.autoRefreshInterval);
        }
    }

    async loadHealthData(): Promise<void> {
        this.isLoading = true;
        this.loadingMessage = 'Fetching sections...';
        this.resetProgress(1); // Initial task for fetching sections

        try {
            // Fetch all sections
            const sections = await this.apiService.getSections().toPromise();
            this.completeProgressStep('Sections fetched');

            if (!sections || sections.length === 0) {
                console.error('No sections found');
                this.loadingMessage = 'No sections found';
                this.isLoading = false;
                return;
            }

            this.sections = [];
            this.scheduleProgressTasks(sections.length); // Each section processed counts as a task

            // Process each section
            let sectionIndex = 0;
            console.log(`Total sections to process: ${sections.length}`);

            for (const section of sections) {
                sectionIndex++;
                this.currentProgress = sectionIndex;
                this.loadingMessage = `Processing ${section.name} (${sectionIndex}/${sections.length})...`;
                console.log(`Processing section: ${section.name} (${sectionIndex}/${sections.length})`);

                const sectionHealth: SectionHealthStatus = {
                    sectionName: section.name,
                    sectionId: section.id,
                    classes: [],
                    totalLinks: 0,
                    workingLinks: 0,
                    brokenLinks: 0,
                    emptyLinks: 0,
                    healthPercentage: 0
                };

                try {
                    // Fetch classes for this section
                    console.log(`Fetching classes for section: ${section.name} (ID: ${section.id})`);
                    const classes = await this.apiService.getClasses(section.id.toString()).toPromise();
                    console.log(`Found ${classes?.length || 0} classes for section: ${section.name}`);
                    this.scheduleProgressTasks(classes?.length || 0); // Track class-level tasks

                    if (classes && classes.length > 0) {
                        // Process each class
                        for (const classItem of classes) {
                            this.loadingMessage = `Processing ${section.name} - ${classItem.name}...`;
                            console.log(`  Processing class: ${classItem.name}`);
                            const classHealth = await this.checkClassHealth(classItem);
                            sectionHealth.classes.push(classHealth);
                            this.completeProgressStep(`Completed ${section.name} - ${classItem.name}`);

                            // Aggregate section stats
                            sectionHealth.totalLinks += (classHealth.totalDays * 4); // 4 links per day
                            sectionHealth.workingLinks += classHealth.workingLinks;
                            sectionHealth.brokenLinks += classHealth.brokenLinks;
                            sectionHealth.emptyLinks += classHealth.emptyLinks;
                        }
                    }
                } catch (error) {
                    console.error(`Error processing section ${section.name}:`, error);
                    // Continue with next section even if this one fails
                }

                this.completeProgressStep(`Completed section ${section.name}`);
                // Calculate section health percentage
                if (sectionHealth.totalLinks > 0) {
                    sectionHealth.healthPercentage = Math.round(
                        (sectionHealth.workingLinks / sectionHealth.totalLinks) * 100
                    );
                }

                this.sections.push(sectionHealth);
            }

            // Calculate overall statistics
            this.loadingMessage = 'Calculating statistics...';
            this.calculateOverallStats();
            this.lastChecked = new Date();
            this.loadingMessage = 'Complete!';
        } catch (error) {
            console.error('Error loading health data:', error);
            console.error('Error details:', JSON.stringify(error, null, 2));
            this.loadingMessage = 'Error loading data. Please try again.';
        } finally {
            // Force change detection to hide loading screen
            this.isLoading = false;
            this.cdr.detectChanges();
            console.log('Loading complete. isLoading set to false');
        }
    }

    async checkClassHealth(classItem: Class): Promise<ClassHealthStatus> {
        const classHealth: ClassHealthStatus = {
            className: classItem.name,
            classId: classItem.id,
            days: [],
            totalDays: 0,
            workingLinks: 0,
            brokenLinks: 0,
            emptyLinks: 0,
            healthPercentage: 0
        };

        try {
            // Fetch days for this class
            const days = await this.apiService.getDays(classItem.id.toString()).toPromise();

            if (days && days.length > 0) {
                classHealth.totalDays = days.length;
                    this.scheduleProgressTasks(days.length); // Each day contributes to progress

                // Check each day's links
                for (const day of days) {
                    const dayHealth = await this.checkDayHealth(day);
                    classHealth.days.push(dayHealth);
                        this.completeProgressStep(`Processed ${classItem.name} - Day ${day.day_number}`);

                    // Count link statuses
                    [dayHealth.quizLink, dayHealth.projectLink, dayHealth.englishVideo, dayHealth.teluguVideo].forEach(link => {
                        if (link.status === 'working') classHealth.workingLinks++;
                        else if (link.status === 'broken') classHealth.brokenLinks++;
                        else if (link.status === 'empty') classHealth.emptyLinks++;
                    });
                }
            }

            // Calculate class health percentage
            const totalLinks = classHealth.totalDays * 4;
            if (totalLinks > 0) {
                classHealth.healthPercentage = Math.round(
                    (classHealth.workingLinks / totalLinks) * 100
                );
            }
        } catch (error) {
            console.error(`Error checking class ${classItem.name}:`, error);
        }

        return classHealth;
    }

    async checkDayHealth(day: Day): Promise<DayHealthStatus> {
        const dayHealth: DayHealthStatus = {
            dayNumber: day.day_number,
            topic: day.topic || `Day ${day.day_number}`,
            quizLink: await this.checkLink(day.quiz_link || ''),
            projectLink: await this.checkLink(day.project_link || ''),
            englishVideo: await this.checkYouTubeVideo(day.id, 'english'),
            teluguVideo: await this.checkYouTubeVideo(day.id, 'telugu')
        };

        return dayHealth;
    }

    async checkLink(url: string, type: 'general' | 'youtube' = 'general'): Promise<LinkStatus> {
        if (!url || url.trim() === '') {
            return { url: '', status: 'empty' };
        }

        // For YouTube, construct full URL if it's just an ID
        let fullUrl = url;
        if (type === 'youtube' && !url.includes('http')) {
            fullUrl = `https://www.youtube.com/watch?v=${url}`;
        }

        const linkStatus: LinkStatus = {
            url: fullUrl,
            status: 'checking'
        };

        try {
            // Use backend validation for accurate status checking
            const result = await this.apiService.validateLink(url, type).toPromise();

            if (result && result.status === 'working') {
                linkStatus.status = 'working';
            } else {
                linkStatus.status = 'broken';
            }
        } catch (error) {
            linkStatus.status = 'broken';
        }

        return linkStatus;
    }

    private resetProgress(initialTasks = 1): void {
        this.currentProgress = 0;
        this.totalProgress = Math.max(initialTasks, 1);
    }

    private scheduleProgressTasks(count: number): void {
        if (count > 0) {
            this.totalProgress += count;
        }
    }

    private completeProgressStep(message?: string): void {
        if (this.totalProgress === 0) {
            this.totalProgress = 1;
        }
        this.currentProgress = Math.min(this.currentProgress + 1, this.totalProgress);
        if (message) {
            this.loadingMessage = message;
        }
        this.cdr.detectChanges();
    }

    async checkYouTubeVideo(dayId: string, language: 'english' | 'telugu'): Promise<LinkStatus> {
        const linkStatus: LinkStatus = {
            url: '',
            status: 'checking'
        };

        try {
            // Fetch video data from API with timeout
            const response: any = await Promise.race([
                this.http.get(`http://localhost:3000/api/admin/content/${dayId}`).toPromise(),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
            ]);

            if (response && response.videos) {
                const video = response.videos.find((v: any) => v.language === language);

                if (video && video.youtube_id && video.youtube_id.trim() !== '') {
                    const videoId = video.youtube_id.trim();
                    linkStatus.url = `https://www.youtube.com/watch?v=${videoId}`;
                    
                    // Actually validate the YouTube video using backend API
                    try {
                        const validationResult = await this.apiService.validateLink(videoId, 'youtube').toPromise();
                        if (validationResult && validationResult.status === 'working') {
                            linkStatus.status = 'working';
                        } else {
                            linkStatus.status = 'broken';
                        }
                    } catch (validationError) {
                        // If validation fails, mark as broken
                        linkStatus.status = 'broken';
                    }
                } else {
                    linkStatus.status = 'empty';
                }
            } else {
                linkStatus.status = 'empty';
            }
        } catch (error) {
            linkStatus.status = 'empty';
        }

        return linkStatus;
    }

calculateOverallStats(): void {
    this.overallStats = {
        totalLinks: 0,
        workingLinks: 0,
        brokenLinks: 0,
        emptyLinks: 0,
        healthPercentage: 0
    };

    this.sections.forEach(section => {
        this.overallStats.totalLinks += section.totalLinks;
        this.overallStats.workingLinks += section.workingLinks;
        this.overallStats.brokenLinks += section.brokenLinks;
        this.overallStats.emptyLinks += section.emptyLinks;
    });

    if(this.overallStats.totalLinks > 0) {
    this.overallStats.healthPercentage = Math.round(
        (this.overallStats.workingLinks / this.overallStats.totalLinks) * 100
    );
}
    }

refreshData(): void {
    this.loadHealthData();
}

toggleSection(sectionId: number): void {
    this.selectedSection = this.selectedSection === sectionId ? null : sectionId;
    this.selectedClass = null;
}

toggleClass(classId: number): void {
    this.selectedClass = this.selectedClass === classId ? null : classId;
}

getStatusColor(status: string): string {
    switch (status) {
        case 'working': return '#10b981';
        case 'broken': return '#ef4444';
        case 'empty': return '#f59e0b';
        case 'checking': return '#6b7280';
        default: return '#6b7280';
    }
}

getHealthColor(percentage: number): string {
    if (percentage >= 80) return '#10b981';
    if (percentage >= 50) return '#f59e0b';
    return '#ef4444';
}

exportReport(): void {
    const report = {
        generatedAt: new Date().toISOString(),
        overallStats: this.overallStats,
        sections: this.sections
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `health-report-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    window.URL.revokeObjectURL(url);
}

// Advanced Filter Options
filterOptions = {
    status: 'all', // 'all', 'working', 'broken', 'empty'
    type: 'all',   // 'all', 'quiz', 'project', 'english', 'telugu'
};

getFilteredSections(): SectionHealthStatus[] {
    let filtered = this.sections;

    // 1. Filter by Search Query (Section Name)
    if (this.searchQuery) {
        const query = this.searchQuery.toLowerCase();
        filtered = filtered.filter(section =>
            section.sectionName.toLowerCase().includes(query) ||
            section.classes.some(c => c.className.toLowerCase().includes(query))
        );
    }

    // 2. Filter by Status and Type (Deep Filter)
    if (this.filterOptions.status !== 'all' || this.filterOptions.type !== 'all') {
        filtered = filtered.map(section => {
            // Clone section to avoid mutating original data
            const sectionCopy = { ...section };

            // Filter classes
            sectionCopy.classes = section.classes.map(classItem => {
                const classCopy = { ...classItem };

                // Filter days
                classCopy.days = classItem.days.filter(day => {
                    // Check specific link types based on filter
                    const linksToCheck = [];

                    if (this.filterOptions.type === 'all' || this.filterOptions.type === 'quiz') linksToCheck.push(day.quizLink);
                    if (this.filterOptions.type === 'all' || this.filterOptions.type === 'project') linksToCheck.push(day.projectLink);
                    if (this.filterOptions.type === 'all' || this.filterOptions.type === 'english') linksToCheck.push(day.englishVideo);
                    if (this.filterOptions.type === 'all' || this.filterOptions.type === 'telugu') linksToCheck.push(day.teluguVideo);

                    // If filtering by status, check if ANY of the selected link types match the status
                    if (this.filterOptions.status !== 'all') {
                        return linksToCheck.some(link => link.status === this.filterOptions.status);
                    }

                    return true;
                });

                return classCopy;
            }).filter(c => c.days.length > 0); // Only keep classes with matching days

            return sectionCopy;
        }).filter(s => s.classes.length > 0); // Only keep sections with matching classes
    }

    return filtered;
}

setFilterStatus(status: string): void {
    this.filterOptions.status = status;
}

setFilterType(type: string): void {
    this.filterOptions.type = type;
}
}
