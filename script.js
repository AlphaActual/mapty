'use strict';




const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');
const sortDivider = document.querySelector('.sort__devider');
const showSortBtns = document.querySelector('.show__sort__btns');
const clearAllBtn = document.querySelector('.clr__all__btn');
const overviewBtn = document.querySelector('.overview__btn');
const confMsg = document.querySelector('.confirmation__msg');
const yesBtn = document.querySelector('.yes__button');
const noBtn = document.querySelector('.no__button');
const sortContainer = document.querySelector('.sort__buttons__container');



class Workout {
    
    id = Math.random() + '';
    constructor(coords, distance, duration, date){
        this.coords = coords; // [lat,lng]
        this.distance = distance; //in km
        this.duration = duration; // in min
        this.date = date;
        
    }

    _setDescription(){
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        const date = new Date(this.date); // convert date string stored in miliseconds to object so to extract month and day
        
        this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} ${this.distance} km on ${months[date.getMonth()]} ${date.getDate()}. ${date.getHours()}:${date.getMinutes()}`;
        
    }
}

class Running extends Workout {
    type = 'running';
    constructor(coords, distance, duration, date, cadence){
        super(coords, distance, duration, date);
        this.cadence = cadence
        this.calcPace();
        this._setDescription();
    }

    calcPace(){
        // min/km
        this.pace = this.duration / this.distance
        return this.pace
    }
}

class Cycling extends Workout {
    type = 'cycling';
    constructor(coords, distance, duration, date, elevationGain){
        super(coords, distance, duration, date);
        this.elevationGain = elevationGain;
        this.calcSpeed();
        this._setDescription();
    }

    calcSpeed(){
        //km/h
        this.speed = this.distance / (this.duration / 60)
    }
}




/////////////////////////////////////////////////////////////////
// APP ARCHITECTURE



class App {
    #map;
    #mapEvent;
    #workouts = [];
    #markers = [];
    constructor(){

        this._getPosition();

        form.addEventListener('submit', this._newWorkout.bind(this));

        inputType.addEventListener('change',this._toggleElevationField);

        //listener for remove button and set in to view (click event)
        containerWorkouts.addEventListener('click',this._handleWorkoutClick.bind(this));

        //listener for input changes (user edits) - change event
        containerWorkouts.addEventListener('change',this._updateWorkoutInfo.bind(this));

        this._checkStorageAndLoad();

        showSortBtns.addEventListener('click',this._toggleSortBtns.bind(this));

        //sort event listener
        sortContainer.addEventListener('click',this._sortAndRender.bind(this));

        //clear workouts listeners
        clearAllBtn.addEventListener('click',this._showDeleteMsg);

        yesBtn.addEventListener('click', this._clearAll);

        noBtn.addEventListener('click', function() {
            confMsg.classList.add('msg__hidden');
            
        });
    }
    _handleWorkoutClick(e){
        // find info about workout that was clicked
        const [id,foundWorkout,workoutIndex,element] = this._getId(e);
        // if no info, return
        if (!id) return;
        
            
    
        // 2. if remove__btn is clicked then remove item
        if (e.target.classList.contains("remove__btn")) {
          this._removeWorkout( element, workoutIndex);

            // 4. update local storage 
            this._saveWorkouts();

            return;
        };
        // 3. if an input field was clicked do nothing
        if (e.target.classList.contains("workout__value")) {
            return;
        };
       

        // 4. otherwise center item on map
        this._setIntoView(foundWorkout);
    }

    _sortAndRender(e){
        const element = e.target.closest('.sort__button');
        let currentDirection = 'descending'; //default 
        if (!element) return;
        const arrow = element.querySelector('.arrow');
        const type = element.dataset.type;
        
        // set all arrows to default state (down)
        sortContainer.querySelectorAll('.arrow').forEach(e=> e.classList.remove('arrow__up'));
        
        // get which direction to sort
        const typeValues = this.#workouts.map(workout => {return workout[type]})
        const sortedAscending = typeValues.slice().sort(function(a, b){return a-b}).join('');
        const sortedDescending = typeValues.slice().sort(function(a, b){return b-a}).join('');
        
        
        // compare sortedAscending array with values from #workout array to check how are they sorted
        // 1. case 1 ascending
        if (typeValues.join('') === sortedAscending) {
            currentDirection = 'ascending'
               
            arrow.classList.add('arrow__up') 
            
        }
        // 2. case 2 descending
        if (typeValues.join('') === sortedDescending) {
            currentDirection = 'descending' 
           
            arrow.classList.remove('arrow__up')   
    
        }
        
        // sort main workouts array
        this._sortArray(this.#workouts, currentDirection, type);

        
        ///////// RE-RENDER //////// 
        // clear rendered workouts from DOM
        containerWorkouts.querySelectorAll('.workout').forEach(workout => workout.remove());
        // clear workouts from map(to prevent bug)
        this.#markers.forEach(marker=> marker.remove());
        //clear array
        this.#markers = [];
        // render list all again sorted
        this.#workouts.forEach(workout => {
            this._renderWorkout(workout);
            // create new markers and render them on map
            this._renderWorkoutMarker(workout);
        });
        
    }
    _sortArray(array,currentDirection,type){
        
        // sort opposite to the currentDirection
        if (currentDirection === 'ascending') {
            array.sort(function(a, b){return b[type]-a[type]});
           
            
        }
        if (currentDirection === 'descending') {
            array.sort(function(a, b){return a[type]-b[type]});
            
            
        }

    }

    _toggleSortBtns(){
        sortContainer.classList.toggle('zero__height');
    }
    _showDeleteMsg(){
        confMsg.classList.remove('msg__hidden');
    }

    _checkStorageAndLoad(){
        const workouts = localStorage.getItem('workouts');
        if (!workouts) return

        // Rebuild objects based on storage
        const tempWorkouts = JSON.parse(workouts);
        tempWorkouts.forEach(workout => {
            const typeOfWorkout = workout.type;
            let newWorkout;
            // create workout object
            if (typeOfWorkout === 'running') {
                 newWorkout = new Running(workout.coords, workout.distance, workout.duration, workout.date, workout.cadence);
            };
            if (typeOfWorkout === 'cycling') {
                 newWorkout = new Cycling(workout.coords, workout.distance, workout.duration, workout.date, workout.elevationGain);
            };
            
            //push the created workout object in the array
            this.#workouts.push(newWorkout);
        });
        //Once all objects are created and stored in array #workouts
        // render workouts in a list
        this.#workouts.forEach(workout =>  this._renderWorkout(workout));
        // map markers will load after map is loaded    
    };
    _saveWorkouts(){
        const workoutString = JSON.stringify(this.#workouts);
        window.localStorage.setItem('workouts', workoutString);
    }

    _getPosition(){

        if(navigator.geolocation)
        navigator.geolocation.getCurrentPosition(this._loadMap.bind(this),function(){
            alert("Could not get your position")
        });
    }

    _loadMap(position){
        
    
            const {latitude, longitude} = position.coords;
            const myCoordinates = [latitude, longitude];
        
            this.#map = L.map('map').setView(myCoordinates, 13);

            L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            // maxZoom: 20,
            // subdomains:['mt0','mt1','mt2','mt3']
            }).addTo(this.#map);

            //show form when clicking on map
            this.#map.on('click', this._showForm.bind(this));

            // google tile 
            // http://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}
            // original tile
            // https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png
            if(!this.#workouts) return
            this.#workouts.forEach(workout => this._renderWorkoutMarker(workout));  

            // overview button listener
            overviewBtn.addEventListener('click', this._overview.bind(this));
    }

    _showForm(mapE){
        //exporting mapevent to private variable so we can use it outside  event listener
        this.#mapEvent = mapE;
        form.classList.remove('hidden');
        inputDistance.focus();
    }
    _hideForm(){
        inputDistance.value = inputDuration.value = inputCadence.value = inputElevation.value = "";
        form.style.display = 'none';
        form.classList.add('hidden');
        setTimeout(() => {
            form.style.display = 'grid';
        }, 1000);
    }

    _toggleElevationField(){
        inputElevation.closest('.form__row').classList.toggle('form__row--hidden')
        inputCadence.closest('.form__row').classList.toggle('form__row--hidden')
    }

    _newWorkout(e){
        ///////// HELPER FUNCTIONS
        // check if type is number
        const validInputs = (...inputs) => inputs.every(inp => Number.isFinite(inp));
        // check if number is positive
        const allPositive = (...inputs) => inputs.every(inp => inp > 0);


        e.preventDefault();

        // Get data from form
        const type = inputType.value;
        const distance = +inputDistance.value //converting to number with +
        const duration = +inputDuration.value //converting to number with +
        const{lat, lng} = this.#mapEvent.latlng;
        let workout;
        const date = Date.now(); // number in miliseconds. This way we can easily restore date object later(when it converts back from JSON upon storage load) and use its methods
       
        
        
        // If workout is running create running object
        if(type === 'running'){
            const cadence = +inputCadence.value;
            // Check if data is valid
            if(
                !validInputs(distance,duration,cadence) ||
                !allPositive(distance, duration, cadence)
            ) return alert('Inputs have to be positive numbers');

            workout = new Running([lat, lng], distance, duration, date, cadence);
            

        }

        // If workout is cycling create cycling object
        if(type === 'cycling'){
            const elevation = +inputElevation.value;
            // Check if data is valid
            if(
                !validInputs(distance,duration,elevation)||
                !allPositive(distance, duration)
            ) return alert('Inputs have to be positive numbers');

            // create new workout object
            workout = new Cycling([lat, lng], distance, duration, date, elevation);
            
        }

        
        this._renderWorkoutMarker(workout)

        // Add workout object to workout array
        this.#workouts.push(workout);

        // Render workout  
        this._renderWorkout(workout)

        //hide form
        this._hideForm();
       
       
    }
    _renderWorkoutMarker(workout){
        
        // create marker
       const layer = L.marker(workout.coords).addTo(this.#map).bindPopup(L.popup({
            maxWidth: 250,
            minWidth: 100,
            autoClose: false,
            closeOnClick: false,
            className: `${workout.type}-popup`
        })).setPopupContent(`${workout.type === "running" ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`).openPopup();

        // put the marker inside markers array
         this.#markers.push(layer);
    }

    _renderWorkout(workout){
        
        let html = `
      <li class="workout workout--${workout.type}" data-id="${workout.id}">
        <h2 class="workout__title">${workout.description}</h2>
        <div class="workout__details">
          <span class="workout__icon">${workout.type === "running" ? '🏃‍♂️' : '🚴‍♀️'}</span>
          <input class="workout__value" value="${workout.distance}" data-type="distance" required size="1">
          <span class="workout__unit">km</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⏱</span>
          <input class="workout__value" value="${workout.duration}" data-type="duration" required size="1">
          <span class="workout__unit">min</span>
        </div>`;

        if (workout.type === 'running') {
            html += ` 
          <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <input class="workout__value" value="${workout.pace.toFixed(1)}" data-type="pace" disabled required size="1">
            <span class="workout__unit">min/km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">🦶🏼</span>
            <input class="workout__value" value="${workout.cadence}" data-type="cadence" required size="1">
            <span class="workout__unit">spm</span>
          </div>
          <button class="remove__btn">×</button>
        </li>`;
            
        }

        if (workout.type === 'cycling') {
            html += `
            <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <input class="workout__value" value="${workout.speed.toFixed(1)}" data-type="speed" disabled required size="2">
            <span class="workout__unit">km/h</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⛰</span>
            <input class="workout__value" value="${workout.elevationGain}" data-type="elevationGain" required size="2">
            <span class="workout__unit">m</span>
          </div>
          <button class="remove__btn">×</button>
        </li>`
        }

        sortDivider.insertAdjacentHTML("afterend", html);
        // save workouts in local storage
        this._saveWorkouts();
        
    }
    _removeWorkout(element, workoutIndex){
        // 1. remove from list
        element.remove();
        
        // 2. remove from array
        this.#workouts.splice(workoutIndex,1)

        // 3. remove from map
        this.#markers[workoutIndex].remove();

        // 4. remove from marker array
        this.#markers.splice(workoutIndex,1)
    }
    _clearAll(){
        localStorage.clear();
        location.reload();
        confMsg.classList.add('msg__hidden');
        
    }

    _getId(e){
        // detect workout element on click
        const element = e.target.closest('.workout');
        if (element) {
            // get info about the workout that was clicked on
            const id = element.dataset.id
            const foundWorkout = this.#workouts.find(elem => elem.id === id)
            const workoutIndex = this.#workouts.indexOf(foundWorkout);
            return [id,foundWorkout,workoutIndex,element]
        }
        return []
    }
    _updateWorkoutInfo(e){
        

        // find info about workout that was clicked
        const [id,foundWorkout,_,element] = this._getId(e);
        // if no info, return
        if (!id) return;
        // get type of input and value
        const typeOfInput = e.target.dataset.type;
        const newInputValue = +e.target.value;
        let type;
        // update workout object with the new value from the input field
        foundWorkout[typeOfInput] = newInputValue;
        // recalculate pace or speed
        if (foundWorkout.type === 'running') {
            foundWorkout.calcPace();
            type = 'pace';
        };
        if (foundWorkout.type === 'cycling') {
            foundWorkout.calcSpeed();
            type = 'speed';
        }
       
        //update calculation in UI in the appropriate input field
        element.querySelector(`input[data-type ="${type}"`).value = foundWorkout[type].toFixed(1);
        // save in local storage (update)
        this._saveWorkouts();

         
    }
    _setIntoView(foundWorkout){
        this.#map.setView(foundWorkout.coords, 13);
    }
    _overview(){
        // if there are no workouts return
         if ((this.#workouts.length === 0)) return;
        // find lowest and highest lat and long to make map bounds that fit all markers
        const latitudes = this.#workouts.map(w => {return w.coords[0]})
        const longitudes = this.#workouts.map(w => {return w.coords[1]})
        const minLat = Math.min(...latitudes);
        const maxLat = Math.max(...latitudes);
        const minLong = Math.min(...longitudes);
        const maxLong= Math.max(...longitudes);
        // fit bounds with coordinates
        this.#map.fitBounds([
            [maxLat, minLong],
            [minLat, maxLong]
        ],{padding:[70,70]});

    }

}

const app = new App();

// check validation message





