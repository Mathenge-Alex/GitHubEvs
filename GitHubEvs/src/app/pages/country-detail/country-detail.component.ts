import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { DataService } from '../../services/data.service';

@Component({
  selector: 'app-country-detail',
  templateUrl: './country-detail.component.html',
  styleUrls: ['./country-detail.component.css'],
})
export class CountryDetailComponent implements OnInit {
  country: any;
  users: any[] = [];
  loading = true;
  error: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private dataService: DataService
  ) {}

  ngOnInit(): void {
    const countryName = this.route.snapshot.paramMap.get('name');
    this.dataService.getData().subscribe(
      (data) => {
        this.country = data.countries.find((c: any) => c.name === countryName);
        if (this.country) {
          this.users = this.country.users;
        }
        this.loading = false;
      },
      (error) => {
        this.error = error;
        this.loading = false;
      }
    );
  }
}
