# Health Dashboard - Link Monitoring System

## Overview
The Health Dashboard is a comprehensive monitoring system that automatically checks and displays the status of all links across your GuideAspire platform. It monitors:
- **Quiz Links** - Links to quiz resources for each day
- **Project Links** - Links to project resources for each day
- **English Videos** - YouTube video embeds in English
- **Telugu Videos** - YouTube video embeds in Telugu

## Features

### 🎯 Real-Time Monitoring
- Automatically checks all links across all sections and classes
- Displays real-time status for each link (Working, Broken, or Empty)
- Auto-refreshes every 5 minutes to keep data current

### 📊 Comprehensive Statistics
- **Overall Health Score** - Percentage of working links across the entire platform
- **Section-wise Breakdown** - Health metrics for each section (class1-5, class6-10, etc.)
- **Class-wise Details** - Detailed status for each class within sections
- **Day-wise Tracking** - Individual link status for each day's content

### 🔍 Smart Filtering & Search
- **Advanced Filtering System**:
  - **Status Filter**: Filter by Working, Broken, or Empty links
  - **Link Type Filter**: Filter by specific content types (Quiz, Project, English Video, Telugu Video)
  - **Deep Search**: Filters drill down to the day level - only showing relevant content
- **Search Functionality**: Quickly find specific sections or classes by name
- **Expandable/Collapsible**: Easy navigation through sections and classes
- **Visual Indicators**: Color-coded badges and icons for instant status recognition

### 📥 Export Functionality
- Export complete health reports as JSON files
- Includes timestamp and all link statuses
- Useful for record-keeping and analysis

## How It Works

### Link Checking Process

1. **Quiz & Project Links**
   - Uses HTTP HEAD requests to verify link accessibility
   - Marks as "working" if the link responds successfully
   - Marks as "broken" if the link fails to respond
   - Marks as "empty" if no link is provided

2. **YouTube Videos**
   - Fetches video data from the backend API
   - Verifies YouTube video IDs using YouTube's oEmbed API
   - Checks both English and Telugu video availability
   - Validates that videos are publicly accessible

3. **Health Calculation**
   - Each day has 4 potential links (quiz, project, English video, Telugu video)
   - Health percentage = (Working Links / Total Links) × 100
   - Aggregates from day → class → section → overall

## Usage

### Accessing the Dashboard
1. Navigate to the home page
2. Click on "Health Dashboard" in the navigation menu (green button)
3. The dashboard will automatically load and check all links

### Understanding the Display

#### Overall Statistics (Top Cards)
- **Total Links**: Total number of links across all sections
- **Working Links**: Number of links that are accessible
- **Broken Links**: Number of links that failed verification
- **Empty Links**: Number of missing links
- **Health Score**: Overall percentage of working links

#### Section View
- Click on a section header to expand/collapse
- Shows aggregated statistics for all classes in that section
- Health bar visualizes the percentage of working links

#### Class View
- Click on a class header to expand/collapse
- Shows all days within that class
- Displays total days and link statistics

#### Day View
- Shows individual link status for each type
- Click the external link icon to open the link in a new tab
- Status indicators show real-time verification results

### Refreshing Data
- Click the "Refresh" button to manually check all links again
- Auto-refresh runs every 5 minutes automatically
- Last checked timestamp is displayed at the top

### Exporting Reports
- Click the "Export Report" button
- Downloads a JSON file with complete health data
- Filename includes the current date for easy organization

## Technical Details

### Architecture
```
HealthDashboardComponent
├── TypeScript (health-dashboard.ts)
│   ├── Link checking logic
│   ├── API integration
│   └── Statistics calculation
├── HTML Template (health-dashboard.html)
│   ├── Statistics display
│   ├── Expandable sections
│   └── Link status indicators
└── CSS Styles (health-dashboard.css)
    ├── Gradient backgrounds
    ├── Animations
    └── Responsive design
```

### API Endpoints Used
- `GET /api/admin/sections` - Fetch all sections
- `GET /api/admin/classes/:section_id` - Fetch classes for a section
- `GET /api/admin/days/:class_id` - Fetch days for a class
- `GET /api/admin/content/:day_id` - Fetch content and videos for a day

### Data Flow
1. Component loads → Fetches sections from API
2. For each section → Fetches classes
3. For each class → Fetches days
4. For each day → Checks all 4 link types
5. Aggregates results → Calculates statistics
6. Updates UI → Displays health status

## Customization

### Adjusting Auto-Refresh Interval
In `health-dashboard.ts`, modify line 82:
```typescript
// Change 5 * 60 * 1000 to desired milliseconds
this.autoRefreshInterval = setInterval(() => {
    this.loadHealthData();
}, 5 * 60 * 1000); // 5 minutes
```

### Modifying Health Thresholds
In `health-dashboard.ts`, update the `getHealthColor()` method:
```typescript
getHealthColor(percentage: number): string {
    if (percentage >= 80) return '#10b981'; // Green
    if (percentage >= 50) return '#f59e0b'; // Yellow
    return '#ef4444'; // Red
}
```

### Styling Customization
All styles are in `health-dashboard.css`. Key variables:
- Gradient backgrounds
- Card shadows and borders
- Animation timings
- Color schemes

## Troubleshooting

### Links Showing as Broken When They Work
- **CORS Issues**: Some external sites block HEAD requests
- **Solution**: The system uses `no-cors` mode, which may not detect all working links
- **Workaround**: Manually verify links if needed

### YouTube Videos Not Detected
- **Private Videos**: Private or unlisted videos won't be detected
- **Deleted Videos**: Removed videos will show as broken
- **Solution**: Ensure all videos are public and accessible

### Slow Loading
- **Large Dataset**: Many sections/classes/days take time to check
- **Network Speed**: Depends on internet connection
- **Solution**: Be patient during initial load; subsequent refreshes use cached data

## Best Practices

1. **Regular Monitoring**: Check the dashboard weekly to catch broken links early
2. **Export Reports**: Save monthly reports for historical tracking
3. **Fix Broken Links**: Address broken links promptly to maintain quality
4. **Complete Empty Links**: Fill in missing links to improve health score
5. **Verify Videos**: Ensure YouTube videos are public and not deleted

## Future Enhancements

Potential improvements for future versions:
- Email notifications for broken links
- Historical trend analysis
- Automated link fixing suggestions
- Integration with link shorteners
- Bulk link testing
- Performance metrics
- Mobile app version

## Support

For issues or questions about the Health Dashboard:
1. Check this documentation first
2. Review the browser console for error messages
3. Verify API endpoints are accessible
4. Contact the development team with specific error details

---

**Version**: 1.0.0  
**Last Updated**: December 2025  
**Developed for**: GuideAspire Platform
