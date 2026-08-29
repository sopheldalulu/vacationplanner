const trip = {
    destination: null,
    stay: null,
    startDate: null,
    endDate: null
};

let PlaceClass = null;
let destinationAutocomplete = null;
let stayAutocomplete = null;
let googleReady = false;
let controlsReady = false;

let savedPlaceIds = JSON.parse(
    localStorage.getItem("perfectDaySavedPlaces") || "[]"
);


/*page controls to run without google*/

document.addEventListener("DOMContentLoaded", () => {
    setupControls();
    updateSavedCount();

    const savedTrip = JSON.parse(
        localStorage.getItem("perfectDayTrip") || "null"
    );

    if (savedTrip) {
        restoreBasicDates(savedTrip);
    }
});


function setupControls() {

    if (controlsReady) {
        return;
    }

    controlsReady = true;


    setupDropdown(
    "destination-trigger",
    "destination-dropdown"
);

    setupDropdown(
    "stay-trigger",
    "stay-dropdown"
);

    setupDropdown(
    "dates-trigger",
    "dates-dropdown"
);


    const applyDatesButton =
        document.getElementById("apply-dates");

    if (applyDatesButton) {
        applyDatesButton.addEventListener(
            "click",
            applyDates
        );
    }


    const exploreButton =
        document.getElementById("explore-button");

    if (exploreButton) {
        exploreButton.addEventListener(
            "click",
            exploreTrip
        );
    }


    const editTripButton =
        document.getElementById("edit-trip");

    if (editTripButton) {
        editTripButton.addEventListener(
            "click",
            () => {
                window.scrollTo({
                    top: 0,
                    behavior: "smooth"
                });
            }
        );
    }


    document
        .querySelectorAll(".category-button")
        .forEach(button => {

            button.addEventListener(
                "click",
                async () => {

                    document
                        .querySelectorAll(".category-button")
                        .forEach(item => {
                            item.classList.remove("active");
                        });

                    button.classList.add("active");

                    if (!googleReady) {
                        showFeedMessage(
                            "Google Places is not connected yet."
                        );
                        return;
                    }

                    await loadPlaces(
                        button.dataset.category
                    );
                }
            );

        });


    document
        .querySelectorAll(".popular-destination")
        .forEach(button => {

            button.addEventListener(
                "click",
                async () => {

                    if (!googleReady) {
                        showSetupMessage(
                            "Google Places is not connected yet. Add a valid Google Maps API key first."
                        );
                        return;
                    }

                    await resolvePopularDestination(
                        button.dataset.city
                    );
                }
            );

        });


    document.addEventListener(
        "click",
        event => {

            if (!event.target.closest(".search-section")) {
                closeDropdowns();
            }

        }
    );
}


/*dropdowns*/

function setupDropdown(triggerId, dropdownId) {

    const trigger =
        document.getElementById(triggerId);

    const dropdown =
        document.getElementById(dropdownId);

    if (!trigger || !dropdown) {
        return;
    }


    trigger.addEventListener(
        "click",
        event => {

            event.stopPropagation();

            const alreadyOpen =
                dropdown.classList.contains("open");

            closeDropdowns();

            if (!alreadyOpen) {
                dropdown.classList.add("open");
            }
        }
    );


    dropdown.addEventListener(
        "click",
        event => {
            event.stopPropagation();
        }
    );
}


function closeDropdowns() {

    document
        .querySelectorAll(".search-dropdown")
        .forEach(dropdown => {
            dropdown.classList.remove("open");
        });
}


/*google places initiation*/

window.initPerfectDay = async function () {

    try {

        const {
            Place,
            PlaceAutocompleteElement
        } = await google.maps.importLibrary("places");


        PlaceClass = Place;
        googleReady = true;


        /* DESTINATION */

        destinationAutocomplete =
            new PlaceAutocompleteElement({
                includedPrimaryTypes: [
                    "locality",
                    "administrative_area_level_1"
                ]
            });


        destinationAutocomplete.placeholder =
            "Search a city...";


        const destinationContainer =
            document.getElementById(
                "destination-autocomplete"
            );


        if (destinationContainer) {

            destinationContainer.innerHTML = "";

            destinationContainer.appendChild(
                destinationAutocomplete
            );
        }


        destinationAutocomplete.addEventListener(
            "gmp-select",
            async ({ placePrediction }) => {

                const place =
                    placePrediction.toPlace();


                await place.fetchFields({
                    fields: [
                        "id",
                        "displayName",
                        "formattedAddress",
                        "location"
                    ]
                });


                selectDestination(place);
            }
        );


        /* stay */

        stayAutocomplete =
            new PlaceAutocompleteElement();


        stayAutocomplete.placeholder =
            "Hotel, resort, hostel or address...";


        const stayContainer =
            document.getElementById(
                "stay-autocomplete"
            );


        if (stayContainer) {

            stayContainer.innerHTML = "";

            stayContainer.appendChild(
                stayAutocomplete
            );
        }


        stayAutocomplete.addEventListener(
            "gmp-select",
            async ({ placePrediction }) => {

                const place =
                    placePrediction.toPlace();


                await place.fetchFields({
                    fields: [
                        "id",
                        "displayName",
                        "formattedAddress",
                        "location"
                    ]
                });


                selectStay(place);
            }
        );


        await restoreGoogleTrip();

        renderSavedPlaces();

        showSetupMessage("");

    }

    catch (error) {

        console.error(
            "Google Places failed:",
            error
        );

        googleReady = false;

        showSetupMessage(
            "Google Places could not load. Check your API key, billing, and enabled APIs."
        );
    }
};


/*select destination*/

function selectDestination(place) {

    if (!place || !place.location) {
        return;
    }

    trip.destination = {
        placeId: place.id,

        name:
            place.displayName ||
            place.formattedAddress ||
            "Destination",

        address:
            place.formattedAddress || "",

        lat: place.location.lat(),

        lng: place.location.lng()
    };


    document.getElementById(
        "destination-label"
    ).textContent = trip.destination.name;


    /* Bias hotel/address search toward destination */

    if (stayAutocomplete) {

        stayAutocomplete.locationBias = {
            center: {
                lat: trip.destination.lat,
                lng: trip.destination.lng
            },

            radius: 30000
        };
    }


    saveTripSettings();

    closeDropdowns();


    /* OPEN THE NEXT STEP */
    setTimeout(() => {

        openDropdown(
            "stay-dropdown"
        );

    }, 200);

}


/*select stay*/

function selectStay(place) {

    if (!place || !place.location) {
        return;
    }

    trip.stay = {

        placeId: place.id,

        name:
            place.displayName ||
            place.formattedAddress ||
            "Accommodation",

        address:
            place.formattedAddress || "",

        lat: place.location.lat(),

        lng: place.location.lng()
    };


    document.getElementById(
        "stay-label"
    ).textContent = trip.stay.name;


    saveTripSettings();

    closeDropdowns();


    /* OPEN DATES NEXT */
    setTimeout(() => {

        openDropdown(
            "dates-dropdown"
        );

    }, 200);

}


/*popular destinations*/

async function resolvePopularDestination(cityName) {

    if (!PlaceClass) {
        return;
    }


    showSetupMessage(
        "Finding destination..."
    );


    try {

        const { places } =
            await PlaceClass.searchByText({

                textQuery: cityName,

                fields: [
                    "id",
                    "displayName",
                    "formattedAddress",
                    "location"
                ],

                maxResultCount: 1
            });


        if (!places || !places.length) {

            showSetupMessage(
                "That destination could not be found."
            );

            return;
        }


        selectDestination(
            places[0]
        );

    }

    catch (error) {

        console.error(error);

        showSetupMessage(
            "Could not load that destination."
        );
    }
}


/* dates */

function applyDates() {

    const startInput =
        document.getElementById(
            "start-date"
        );

    const endInput =
        document.getElementById(
            "end-date"
        );

    const error =
        document.getElementById(
            "date-error"
        );


    if (!startInput || !endInput) {
        return;
    }


    const start =
        startInput.value;

    const end =
        endInput.value;


    if (error) {
        error.textContent = "";
    }


    if (!start || !end) {

        if (error) {
            error.textContent =
                "Choose both dates.";
        }

        return;
    }


    if (end <= start) {

        if (error) {
            error.textContent =
                "Check-out must be after check-in.";
        }

        return;
    }


    trip.startDate = start;
    trip.endDate = end;


    const datesLabel =
        document.getElementById(
            "dates-label"
        );


    if (datesLabel) {

        datesLabel.textContent =
            formatDateRange(start, end);
    }


    saveTripSettings();

    closeDropdowns();
}


/* explore button*/

async function exploreTrip() {

    if (!googleReady) {

        showSetupMessage(
            "Google Places is not connected yet. Check your API key first."
        );

        return;
    }


    if (!trip.destination) {

        showSetupMessage(
            "Choose a destination first."
        );

        openDropdown(
            "destination-dropdown"
        );

        return;
    }


    if (!trip.startDate || !trip.endDate) {

        showSetupMessage(
            "Add your travel dates."
        );

        openDropdown(
            "dates-dropdown"
        );

        return;
    }


    showSetupMessage("");


    const section =
        document.getElementById(
            "discover-section"
        );


    if (!section) {
        return;
    }


    section.classList.remove("hidden");


    setText(
        "discover-city",
        trip.destination.name
    );


    setText(
        "summary-destination",
        `📍 ${trip.destination.name}`
    );


    if (trip.stay) {

        setText(
            "summary-stay",
            `🏨 ${trip.stay.name}`
        );


        setText(
            "discover-subtitle",
            `Showing ideas near ${trip.stay.name} and around ${trip.destination.name}.`
        );

    } else {

        setText(
            "summary-stay",
            "🏨 No stay added"
        );


        setText(
            "discover-subtitle",
            `Discovering places around ${trip.destination.name}.`
        );
    }


    setText(
        "summary-dates",
        `📅 ${formatDateRange(
            trip.startDate,
            trip.endDate
        )}`
    );


    await loadPlaces("for-you");


    section.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
}


function openDropdown(id) {

    closeDropdowns();

    const dropdown =
        document.getElementById(id);

    if (dropdown) {
        dropdown.classList.add("open");
    }
}


/* google place search */

async function loadPlaces(category) {

    if (!PlaceClass || !trip.destination) {
        return;
    }


    const grid =
        document.getElementById(
            "places-grid"
        );


    if (!grid) {
        return;
    }


    grid.innerHTML = "";

    showFeedMessage(
        "Finding places you'll love..."
    );


    try {

        let places;


        if (category === "for-you") {

            places =
                await loadForYouPlaces();

        } else {

            places =
                await searchPlacesByCategory(
                    category
                );
        }


        if (!places.length) {

            showFeedMessage(
                "No places found. Try another category."
            );

            return;
        }


        showFeedMessage(
            `${places.length} places to explore`
        );


        places.forEach(
            (place, index) => {

                grid.appendChild(
                    createPlaceCard(
                        place,
                        index
                    )
                );
            }
        );

    }

    catch (error) {

        console.error(error);

        showFeedMessage(
            "Places could not load. Check the browser console and Google API setup."
        );
    }
}


/* for you */

async function loadForYouPlaces() {

    const destinationName =
        trip.destination.name;


    const searches = [
        `top attractions in ${destinationName}`,
        `popular restaurants in ${destinationName}`,
        `best cafes in ${destinationName}`,
        `museums in ${destinationName}`,
        `parks in ${destinationName}`
    ];


    const results =
        await Promise.all(
            searches.map(query =>
                searchText(
                    query,
                    null,
                    4
                )
            )
        );


    const unique =
        new Map();


    results
        .flat()
        .forEach(place => {

            if (!unique.has(place.id)) {

                unique.set(
                    place.id,
                    place
                );
            }
        });


    return Array.from(
        unique.values()
    );
}


/* category search */

async function searchPlacesByCategory(category) {

    const destination =
        trip.destination.name;


    const queries = {

        tourist_attraction:
            `things to do in ${destination}`,

        restaurant:
            `restaurants in ${destination}`,

        cafe:
            `cafes in ${destination}`,

        shopping_mall:
            `shopping in ${destination}`,

        museum:
            `museums in ${destination}`,

        park:
            `parks in ${destination}`
    };


    return searchText(
        queries[category] ||
        `places to visit in ${destination}`,

        category,

        20
    );
}


/*text search*/

async function searchText(
    query,
    category = null,
    maxResults = 20
) {

    const center =
        trip.stay
            ? {
                lat: trip.stay.lat,
                lng: trip.stay.lng
            }
            : {
                lat: trip.destination.lat,
                lng: trip.destination.lng
            };


    const request = {

        textQuery: query,

        fields: [
            "id",
            "displayName",
            "formattedAddress",
            "location",
            "rating",
            "userRatingCount",
            "photos",
            "googleMapsURI"
        ],

        locationBias: {
            center: center,

            radius:
                trip.stay
                    ? 15000
                    : 30000
        },

        maxResultCount:
            Math.min(maxResults, 20)
    };


    if (category) {
        request.includedType =
            category;
    }


    const { places } =
        await PlaceClass.searchByText(
            request
        );


    return places || [];
}

/* =========================================
   CREATE PLACE CARD
========================================= */

function createPlaceCard(place, index) {

    const card =
        document.createElement("article");

    card.className =
        "place-card";


    const imageWrap =
        document.createElement("div");

    imageWrap.className =
        "place-image-wrap";


    if (place.photos?.length) {

        const photo =
            place.photos[0];


        const image =
            document.createElement("img");

        image.className =
            "place-image";

        image.alt =
            `Photo of ${place.displayName || "place"}`;


        const heights = [
            300,
            390,
            340,
            440,
            320
        ];


        image.style.height =
            `${heights[index % heights.length]}px`;


        image.src =
            photo.getURI({
                maxWidth: 800
            });


        imageWrap.appendChild(
            image
        );

    } else {

        const fallback =
            document.createElement("div");

        fallback.className =
            "no-photo";

        fallback.textContent =
            "✈";

        imageWrap.appendChild(
            fallback
        );
    }


    const pin =
        document.createElement("button");

    pin.type =
        "button";

    pin.className =
        "pin-button";


    const alreadySaved =
        savedPlaceIds.includes(place.id);


    if (alreadySaved) {
        pin.classList.add("saved");
    }


    pin.textContent =
        alreadySaved ? "♥" : "♡";


    pin.addEventListener(
        "click",
        () => {
            toggleSavedPlace(
                place,
                pin
            );
        }
    );


    imageWrap.appendChild(pin);

    card.appendChild(imageWrap);


    const info =
        document.createElement("div");

    info.className =
        "place-info";


    const title =
        document.createElement("h3");

    title.textContent =
        place.displayName ||
        "Unnamed place";

    info.appendChild(title);


    const meta =
        document.createElement("div");

    meta.className =
        "place-meta";


    if (place.rating) {

        const rating =
            document.createElement("span");

        rating.textContent =
            `⭐ ${place.rating.toFixed(1)}`;

        meta.appendChild(rating);
    }


    if (
        trip.stay &&
        place.location
    ) {

        const miles =
            calculateDistanceMiles(
                trip.stay.lat,
                trip.stay.lng,
                place.location.lat(),
                place.location.lng()
            );


        const distance =
            document.createElement("span");

        distance.textContent =
            `📍 ${formatDistance(miles)} from stay`;

        meta.appendChild(distance);
    }


    info.appendChild(meta);


    if (place.formattedAddress) {

        const address =
            document.createElement("p");

        address.className =
            "place-address";

        address.textContent =
            place.formattedAddress;

        info.appendChild(address);
    }


    if (place.googleMapsURI) {

        const link =
            document.createElement("a");

        link.className =
            "maps-link";

        link.href =
            place.googleMapsURI;

        link.target =
            "_blank";

        link.rel =
            "noopener noreferrer";

        link.textContent =
            "View on Google Maps ↗";

        info.appendChild(link);
    }


    card.appendChild(info);

    return card;
}


/* =========================================
   SAVING
========================================= */

function toggleSavedPlace(place, button) {

    const index =
        savedPlaceIds.indexOf(
            place.id
        );


    if (index >= 0) {

        savedPlaceIds.splice(
            index,
            1
        );

        button.classList.remove(
            "saved"
        );

        button.textContent =
            "♡";

        showToast(
            "Removed from your trip"
        );

    } else {

        savedPlaceIds.push(
            place.id
        );

        button.classList.add(
            "saved"
        );

        button.textContent =
            "♥";

        showToast(
            "Added to your trip ♡"
        );
    }


    localStorage.setItem(
        "perfectDaySavedPlaces",
        JSON.stringify(savedPlaceIds)
    );


    updateSavedCount();

    renderSavedPlaces();
}


/* =========================================
   SAVED PLACES
========================================= */

async function renderSavedPlaces() {

    const grid =
        document.getElementById(
            "saved-grid"
        );


    if (!grid) {
        return;
    }


    grid.innerHTML = "";


    if (!savedPlaceIds.length) {

        grid.innerHTML = `
            <div class="empty-saved">
                <span>🧳</span>

                <h3>Nothing saved yet.</h3>

                <p>
                    Find something you love
                    and tap the heart.
                </p>
            </div>
        `;

        return;
    }


    if (!PlaceClass) {
        return;
    }


    for (
        let i = 0;
        i < savedPlaceIds.length;
        i++
    ) {

        try {

            const place =
                new PlaceClass({
                    id: savedPlaceIds[i]
                });


            await place.fetchFields({
                fields: [
                    "id",
                    "displayName",
                    "formattedAddress",
                    "location",
                    "rating",
                    "userRatingCount",
                    "photos",
                    "googleMapsURI"
                ]
            });


            grid.appendChild(
                createPlaceCard(
                    place,
                    i
                )
            );

        } catch (error) {

            console.error(
                "Saved place failed:",
                error
            );
        }
    }
}


/* =========================================
   TRIP STORAGE
========================================= */

function saveTripSettings() {

    const data = {

        destinationPlaceId:
            trip.destination?.placeId || null,

        stayPlaceId:
            trip.stay?.placeId || null,

        startDate:
            trip.startDate,

        endDate:
            trip.endDate
    };


    localStorage.setItem(
        "perfectDayTrip",
        JSON.stringify(data)
    );
}


function restoreBasicDates(saved) {

    if (
        saved.startDate &&
        saved.endDate
    ) {

        trip.startDate =
            saved.startDate;

        trip.endDate =
            saved.endDate;


        const start =
            document.getElementById(
                "start-date"
            );

        const end =
            document.getElementById(
                "end-date"
            );


        if (start) {
            start.value =
                saved.startDate;
        }

        if (end) {
            end.value =
                saved.endDate;
        }


        setText(
            "dates-label",
            formatDateRange(
                saved.startDate,
                saved.endDate
            )
        );
    }
}


async function restoreGoogleTrip() {

    const saved =
        JSON.parse(
            localStorage.getItem(
                "perfectDayTrip"
            ) || "null"
        );


    if (!saved || !PlaceClass) {
        return;
    }


    try {

        if (saved.destinationPlaceId) {

            const destination =
                new PlaceClass({
                    id:
                        saved.destinationPlaceId
                });


            await destination.fetchFields({
                fields: [
                    "id",
                    "displayName",
                    "formattedAddress",
                    "location"
                ]
            });


            selectDestination(
                destination
            );
        }


        if (saved.stayPlaceId) {

            const stay =
                new PlaceClass({
                    id:
                        saved.stayPlaceId
                });


            await stay.fetchFields({
                fields: [
                    "id",
                    "displayName",
                    "formattedAddress",
                    "location"
                ]
            });


            selectStay(stay);
        }

    } catch (error) {

        console.error(
            "Trip restore failed:",
            error
        );
    }
}


/* =========================================
   HELPERS
========================================= */

function setText(id, text) {

    const element =
        document.getElementById(id);

    if (element) {
        element.textContent =
            text;
    }
}


function showSetupMessage(message) {

    setText(
        "setup-message",
        message
    );
}


function showFeedMessage(message) {

    setText(
        "feed-status",
        message
    );
}


function updateSavedCount() {

    setText(
        "trip-count",
        savedPlaceIds.length
    );
}


function formatDateRange(start, end) {

    const createUTCDate =
        value => {

            const [year, month, day] =
                value
                    .split("-")
                    .map(Number);


            return new Date(
                Date.UTC(
                    year,
                    month - 1,
                    day
                )
            );
        };


    const formatter =
        new Intl.DateTimeFormat(
            "en-US",
            {
                month: "short",
                day: "numeric",
                timeZone: "UTC"
            }
        );


    return (
        `${formatter.format(createUTCDate(start))} – ` +
        `${formatter.format(createUTCDate(end))}`
    );
}


function calculateDistanceMiles(
    lat1,
    lon1,
    lat2,
    lon2
) {

    const radius =
        3958.8;


    const radians =
        degrees =>
            degrees *
            Math.PI /
            180;


    const dLat =
        radians(lat2 - lat1);

    const dLon =
        radians(lon2 - lon1);


    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(radians(lat1)) *
        Math.cos(radians(lat2)) *
        Math.sin(dLon / 2) ** 2;


    return (
        radius *
        2 *
        Math.atan2(
            Math.sqrt(a),
            Math.sqrt(1 - a)
        )
    );
}


function formatDistance(miles) {

    if (miles < 0.1) {
        return "<0.1 mi";
    }

    if (miles < 10) {
        return `${miles.toFixed(1)} mi`;
    }

    return `${Math.round(miles)} mi`;
}


let toastTimer;


function showToast(message) {

    const toast =
        document.getElementById(
            "toast"
        );


    if (!toast) {
        return;
    }


    toast.textContent =
        message;

    toast.classList.add(
        "show"
    );


    clearTimeout(
        toastTimer
    );


    toastTimer =
        setTimeout(
            () => {
                toast.classList.remove(
                    "show"
                );
            },
            2000
        );
}