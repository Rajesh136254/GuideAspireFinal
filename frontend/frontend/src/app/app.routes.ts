import { Routes } from '@angular/router';
import { HomeComponent } from './components/pages/home/home';
import { SignupComponent } from './components/pages/signup/signup';
import { LoginComponent } from './components/pages/login/login';
import { CourseSelectComponent } from './components/pages/course-select/course-select';
import { Class1_5Component } from './components/pages/class1-5/class1-5';
import { Class6_10Component } from './components/pages/class6-10/class6-10';
import { SummerComponent } from './components/pages/summer/summer';
import { DashboardComponent } from './components/pages/dashboard/dashboard';
import { HealthDashboardComponent } from './components/pages/health-dashboard/health-dashboard';

export const routes: Routes = [
    { path: '', component: HomeComponent },
    { path: 'home', component: HomeComponent },
    { path: 'signup', component: SignupComponent },
    { path: 'login', component: LoginComponent },
    { path: 'course-select', component: CourseSelectComponent },
    { path: 'class1-5', component: Class1_5Component },
    { path: 'class6-10', component: Class6_10Component },
    { path: 'summer', component: SummerComponent },
    { path: 'admin-dashboard', component: DashboardComponent },
    { path: 'health-dashboard', component: HealthDashboardComponent }
];
