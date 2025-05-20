import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-club-detail',
  templateUrl: './club-detail.component.html',
  styleUrls: ['./club-detail.component.css']
})
export class ClubDetailComponent implements OnInit {
  club: any;
  loading = true;
  error = '';
  apiUrl = 'https://localhost:7172/api/Community';
  defaultRules = [
    "Be respectful to other members",
    "Stay on topic in discussions",
    "No spam or self-promotion",
    "Use appropriate language"
  ];
  Math = Math; // Make Math available in template
  clubId: number | null = null;
  isMember: boolean = false;

  constructor(
    private route: ActivatedRoute,
    public router: Router, // Make router public so it can be accessed from template
    private http: HttpClient
  ) { }

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id && !isNaN(Number(id))) {
        this.clubId = +id;
        this.loadClub(this.clubId);
      } else {
        this.loading = false;
        this.error = 'Ідентифікатор клубу не вказано або некоректний';
        console.error('Invalid club ID:', id);
      }
    });
  }

  loadClub(id: number): void {
    // Додаткова перевірка дійсності ID
    if (!id || isNaN(id)) {
      this.loading = false;
      this.error = 'Некоректний ідентифікатор клубу';
      console.error('Invalid club ID in loadClub:', id);
      return;
    }

    this.loading = true;
    this.http.get<any>(`${this.apiUrl}/Clubs/${id}`, { withCredentials: true })
      .subscribe(
        data => {
          this.club = data;
          
          // Ensure topics array exists
          if (!this.club.topics) {
            this.club.topics = [];
          }
          
          // Request additional comment data for each topic if needed
          if (this.club.topics.length > 0) {
            // Process each topic to get comment counts
            const topicPromises = this.club.topics.map((topic: any) => {
              return new Promise<void>((resolve) => {
                // If commentsCount is undefined or comments array is missing, fetch them
                if (typeof topic.commentsCount === 'undefined' || !topic.comments) {
                  console.log(`Fetching comments for topic: ${topic.id}`);
                  this.http.get<any>(`${this.apiUrl}/Topics/${topic.id}`, { withCredentials: true })
                    .subscribe(
                      topicData => {
                        topic.comments = topicData.comments || [];
                        topic.commentsCount = topic.comments.length;
                        console.log(`Topic ${topic.id} loaded with ${topic.commentsCount} comments`);
                        resolve();
                      },
                      error => {
                        console.error(`Error loading topic ${topic.id}:`, error);
                        topic.commentsCount = 0;
                        topic.comments = [];
                        resolve();
                      }
                    );
                } else {
                  // Use existing comment count or comments array length
                  topic.commentsCount = topic.commentsCount || (topic.comments ? topic.comments.length : 0);
                  resolve();
                }
              });
            });
            
            // When all topic data is loaded, finish loading
            Promise.all(topicPromises).then(() => {
              this.loading = false;
            });
          } else {
            this.loading = false;
          }
        },
        error => {
          console.error('Error loading club:', error);
          this.loading = false;
          this.error = 'Помилка завантаження даних клубу';
        }
      );
  }
  
  goToTopic(topicId: number): void {
    if (this.club && this.club.id) {
      this.router.navigate(['/clubs', this.club.id, 'topics', topicId]);
    }
  }

  getAvatarColor(name: string): string {
    // Simple hash function to generate color based on name
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h = Math.abs(hash) % 360;
    return `hsl(${h}, 70%, 80%)`;
  }

  navigateToTopic(topicId: number): void {
    this.router.navigate(['/topics', topicId]);
  }

  joinClub(): void {
    if (!this.clubId) {
      console.error('Club ID is not defined');
      return;
    }

    this.http.post(`${this.apiUrl}/Clubs/${this.clubId}/Join`, {}, { withCredentials: true })
      .subscribe({
        next: (response: any) => {
          console.log('Successfully joined the club:', response);
          this.isMember = true;
          this.club.membersCount += 1; // Increment member count
        },
        error: (error) => {
          console.error('Error joining the club:', error);
          alert(error.error?.error || 'Не вдалося приєднатися до клубу. Спробуйте пізніше.');
        }
      });
  }
}