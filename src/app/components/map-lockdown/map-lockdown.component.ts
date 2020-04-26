import { Component, OnInit } from '@angular/core';
import * as L from 'leaflet';
import { MarkerService } from '../../_service/marker.service';
import { ShapeService } from '../../_service/shape.service';
import { HttpClient } from '@angular/common/http';

interface Country{
  name: string,
  alpha3: string,
  code: number,
  region: string,
  start: string,
  start_reopening: string,
  end: string,
  expected_end: string,
  historical_coverage: string,
  current_coverage: string,
  historical_population_impacted: number,
  current_population_impacted: number,
  historical_secerity: string,
  current_severity: string,
  movement_restrictions: boolean,
  curfew: boolean,
  public_closed: boolean,
  movement_enforcement: boolean,
  army: string,
  status: string,
  comment: string,
  start_business_closure: string,
  start_reopening_business: string,
  end_business_closure: string,
  status_business: string,
  experition_date: string,
  last_update_date: string,
  source: string,
  comments: string
}

@Component({
  selector: 'app-map-lockdown',
  templateUrl: './map-lockdown.component.html',
  styleUrls: ['./map-lockdown.component.css']
})
export class MapLockdownComponent implements OnInit {

  public map: L.map;
  public info: L.control;
  public legend: L.control;
  public countries: Array<Country>;

  constructor(
    private markerService: MarkerService, 
    private shapeService: ShapeService,
    private http: HttpClient
    ) {
     
    }

  ngOnInit(): void {
    this.http.get('https://covidmeasures-data.s3.amazonaws.com/lockdown.json').subscribe((res:{countries: Array<Country>}) => {
      this.countries = res.countries
      this.initMap();
      this.addInfoBox();
      this.addLegend();
      this.shapeService.getCountriesShapes().subscribe(country => {
        country.features.forEach(item => {
          const foundCountry = this.countries.find(country => country.alpha3 === item.id)
          if (foundCountry) {
            // we add data from apit to each country
            item.countryData = foundCountry
          }else{
            item.countryData = null
          }
        })
        this.initStatesLayer(country);
      });
    // we populate the maps with markers
    // this.markerService.makeStateMarkers(this.map);
    // this.markerService.makeStateCircleMarkers(this.map);
    })
  }
  private initMap(): void{
    // we create the map
    this.map = L.map('map', {
      center: [ 40.416775, -3.703790 ],
      zoom: 3
    });
    // we add tiles for our map
    const tiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    });

    tiles.addTo(this.map);  
  }

  private addInfoBox(){
    // we add info box
    this.info = L.control();

    this.info.onAdd = function (map) {
        this._div = L.DomUtil.create('div', 'info'); // create a div with a class "info"
        this.update();
        return this._div;
    };

    const getTextColor = function(text:string) {
      if (text) {
        const status = text.toLowerCase()
        let color:string;
        switch (status as any) {
          case "no lockdown":
            color = '#66bb6a';
            break;
          case "lockdown":
            color = '#e6595a';
            break;
          case "re-opening":
            color = '#ee7f08';
            break;
          case "re-openning":
            color = '#ee7f08';
            break;
          case "re-open":
            color = '#1898ac';
            break;
          default:
            color = '#555';
            break;
        }
        return color
      }
    };
    // method that we will use to update the control based on feature properties passed
    this.info.update = function (country:Country) {
        this._div.innerHTML = 
        '<h4>Lockdown Status</h4>' +  (country ?
        `<b>${country.name}</b><br />
        <span style="color:${getTextColor(country.status)}">${country.status}</span>`
        : 'Hover over a Country');
    };

    this.info.addTo(this.map);
  }

  private addLegend(){
    // we add legends to our map
    this.legend = L.control({position: 'bottomright'});
    const getColor = function(status) {
      return  status == "No data" ? '#e3e3e3' :
              status == "No Lockdown" ? '#66bb6a' :
              status == "Lockdown" ? '#e6595a' :
              status == "Re-opening" ? '#ffeb3b' : 
              status == "Re-open"  ? '#1898ac' :
                        '#e3e3e3';
    }
    this.legend.onAdd = function (map) {

        const div = L.DomUtil.create('div', 'info legend'),
            status = ['No data', 'No Lockdown', 'Lockdown','Re-opening', 'Re-open'],
            labels = [];

        // loop through our density intervals and generate a label with a colored square for each interval
        for (let i = 0; i < status.length; i++) {
            div.innerHTML +=
                '<i style="background:' + getColor(status[i]) + '"></i>    <strong>' + status[i] + '</strong> <br>';
        }

        return div;
    };

    this.legend.addTo(this.map);
  }

  private initStatesLayer(item) {
    const stateLayer = L.geoJSON(item, {
      style: (feature) => ({
        weight: 3,
        opacity: 0.5,
        color: 'aliceblue',
        fillOpacity: 0.8,
        fillColor: this.getFillColor(feature.countryData)
      }),
      onEachFeature: (feature, layer) => (
        layer.bindPopup(this.clickedCountry(feature.countryData)).on({
          mouseover: (e) => (this.highlightFeature(e)),
          mouseout: (e) => (this.resetFeature(e))
        })
      )
    });
    this.map.addLayer(stateLayer);
  }
  private getFillColor(country: Country) {
    if (country) {
      if(country.status.toLowerCase() == "no data") return '#e3e3e3';
      if(country.status.toLowerCase() == "no lockdown") return '#66bb6a';
      if(country.status.toLowerCase() == "lockdown") return '#e6595a';

      if(
        country.status.toLowerCase() == "re-openning" || 
        country.status.toLowerCase() == "re-opening"
        ) return '#ffeb3b';
      if(country.status.toLowerCase() == "re-open") return '#1898ac';
      else return '#e3e3e3'
    }
    return '#e3e3e3'
  }

  private highlightFeature(e)  {
    const layer = e.target;
    layer.setStyle({
      weight: 2,
      opacity: 1,
      // color: '#DFA612',
      fillOpacity: .6,
      // fillColor: '#FAE042',
    });
    this.info.update(layer.feature.countryData)
  }

  private resetFeature(e)  {
    const layer = e.target;
    layer.setStyle({
      weight: 3,
      opacity: 0.5,
      color: 'aliceblue',
      fillOpacity: 0.8,
      // fillColor: this.getFillColor(id)
    });
    this.info.update()
  }
  private clickedCountry(country){
    if (country) {
      return `
      <div>
        <h6>
          <strong>${country.name}</strong>
        </h6>
      </div>
    `;
    }
  }
}