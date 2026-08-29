/*google places + trip planner*/


const trip = {
    destination: null,
    stay: null,
    startDate: null,
    endDate: null
};


let PlaceClass = null;

let destinationAutocomplete = null;
let stayAutocomplete = null;

let currentPlaces = [];

let savedPlaceIds =
    JSON.parse(
        localStorage.getItem("perfectDaySavedPlaces") || "[]"
    );


/*google initialization*/

window.initPerfectDay = async function () {

    try {

        const {
            Place,
            PlaceAutocompleteElement
        } =
            await google.maps.importLibrary("places");


        PlaceClass = Place;


        /*destination autocomplete*/

        destinationAutocomplete =
            new PlaceAutocompleteElement({
                includedPrimaryTypes: [
                    "(cities)"
                ]
            });


        destinationAutocomplete.placeholder =
            "Search a city...";


        document
            .getElementById(
                "destination-autocomplete"
            )
            .appendChild(
                destinationAutocomplete
            );


        destinationAutocomplete
            .addEventListener(
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


        /*stay autocomplete*/

        stayAutocomplete =
            new PlaceAutocompleteElement();


        stayAutocomplete.placeholder =
            "Hotel, resort or address...";


        document
            .getElementById(
                "stay-autocomplete"
            )
            .appendChild(
                stayAutocomplete
            );


        stayAutocomplete
            .addEventListener(
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


        setupControls();

        restoreTrip();

        updateSavedCount();

    }

    catch (error) {

        console.error(
            "Google Places failed to initialize:",
            error
        );


        document.getElementById(
            "setup-message"
        ).textContent =
            "Google Places could not load. Check your API key and Google Cloud settings.";

    }

};


/*select destination*/

function selectDestination(place) {

    if (!place.location) {
        return;
    }


    trip.destination = {
        placeId: place.id,

        name:
            place.displayName ||
            place.formattedAddress,

        address:
            place.formattedAddress || "",

        lat:
            place.location.lat(),

        lng:
            place.location.lng()
    };


    document.getElementById(
        "destination-label"
    ).textContent =
        trip.destination.name;


    closeDropdowns();


    /*
        bias the accommodation search
        toward the chosen destination.
    */

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

}


/*select stay*/

function selectStay(place) {

    if (!place.location) {
        return;
    }


    trip.stay = {
        placeId: place.id,

        name:
            place.displayName ||
            place.formattedAddress,

        address:
            place.formattedAddress || "",

        lat:
            place.location.lat(),

        lng:
            place.location.lng()
    };


    document.getElementById(
        "stay-label"
    ).textContent =
        trip.stay.name;


    closeDropdowns();

    saveTripSettings();

}


/*controls*/

function setupControls() {

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


    document
        .getElementById("apply-dates")
        .addEventListener(
            "click",
            applyDates
        );


    document
        .getElementById("explore-button")
        .addEventListener(
            "click",
            exploreTrip
        );


    document
        .getElementById("edit-trip")
        .addEventListener(
            "click",
            () => {

                window.scrollTo({
                    top: 0,
                    behavior: "smooth"
                });

            }
        );


    document
        .querySelectorAll(
            ".category-button"
        )
        .forEach(button => {

            button.addEventListener(
                "click",
                async () => {

                    document
                        .querySelectorAll(
                            ".category-button"
                        )
                        .forEach(item => {
                            item.classList.remove(
                                "active"
                            );
                        });


                    button.classList.add(
                        "active"
                    );


                    await loadPlaces(
                        button.dataset.category
                    );

                }
            );

        });


    document
        .querySelectorAll(
            ".popular-destination"
        )
        .forEach(button => {

            button.addEventListener(
                "click",
                async () => {

                    await resolvePopularDestination(
                        button.dataset.city
                    );

                }
            );

        });


    document.addEventListener(
        "click",
        event => {

            if (
                !event.target.closest(
                    ".search-section"
                )
            ) {

                closeDropdowns();

            }

        }
    );

}


/*dropdown logic T^T*/

function setupDropdown(
    triggerId,
    dropdownId
) {

    const trigger =
        document.getElementById(
            triggerId
        );


    const dropdown =
        document.getElementById(
            dropdownId
        );


    trigger.addEventListener(
        "click",
        event => {

            event.stopPropagation();


            const alreadyOpen =
                dropdown.classList.contains(
                    "open"
                );


            closeDropdowns();


            if (!alreadyOpen) {

                dropdown.classList.add(
                    "open"
                );

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
        .querySelectorAll(
            ".search-dropdown"
        )
        .forEach(dropdown => {

            dropdown.classList.remove(
                "open"
            );

        });

}


/*popular destinations*/

async function resolvePopularDestination(
    cityName
) {

    if (!PlaceClass) {
        return;
    }


    showSetupMessage(
        "Finding destination..."
    );


    try {

        const { places } =
            await PlaceClass.searchByText({

                textQuery:
                    cityName,

                fields: [
                    "id",
                    "displayName",
                    "formattedAddress",
                    "location"
                ],

                maxResultCount: 1

            });


        if (!places.length) {

            showSetupMessage(
                "Destination could not be found."
            );

            return;

        }


        selectDestination(
            places[0]
        );


        showSetupMessage("");

    }

    catch (error) {

        console.error(error);

        showSetupMessage(
            "Could not load that destination."
        );

    }

}


/*dates*/

function applyDates() {

    const start =
        document.getElementById(
            "start-date"
        ).value;


    const end =
        document.getElementById(
            "end-date"
        ).value;


    const error =
        document.getElementById(
            "date-error"
        );


    error.textContent = "";


    if (!start || !end) {

        error.textContent =
            "Choose both dates.";

        return;

    }


    /*
        Date-only strings are directly
        comparable in YYYY-MM-DD format.
    */

    if (end <= start) {

        error.textContent =
            "Check-out must be after check-in.";

        return;

    }


    trip.startDate = start;
    trip.endDate = end;


    document.getElementById(
        "dates-label"
    ).textContent =
        formatDateRange(
            start,
            end
        );


    saveTripSettings();

    closeDropdowns();

}


/*explore*/

async function exploreTrip() {

    if (!trip.destination) {

        showSetupMessage(
            "Choose your destination first."
        );

        return;

    }


    if (
        !trip.startDate ||
        !trip.endDate
    ) {

        showSetupMessage(
            "Add your travel dates."
        );

        return;

    }


    showSetupMessage("");


    const section =
        document.getElementById(
            "discover-section"
        );


    section.classList.remove(
        "hidden"
    );


    document.getElementById(
        "discover-city"
    ).textContent =
        trip.destination.name;


    document.getElementById(
        "summary-destination"
    ).textContent =
        `📍 ${trip.destination.name}`;


    if (trip.stay) {

        document.getElementById(
            "summary-stay"
        ).textContent =
            `🏨 ${trip.stay.name}`;


        document.getElementById(
            "discover-subtitle"
        ).textContent =
            `Discovering great places around ${trip.stay.name} and ${trip.destination.name}.`;

    }

    else {

        document.getElementById(
            "summary-stay"
        ).textContent =
            "🏨 Stay not added";


        document.getElementById(
            "discover-subtitle"
        ).textContent =
            `Discovering great places around ${trip.destination.name}.`;

    }


    document.getElementById(
        "summary-dates"
    ).textContent =
        `📅 ${formatDateRange(
            trip.startDate,
            trip.endDate
        )}`;


    await loadPlaces(
        "for-you"
    );


    section.scrollIntoView({
        behavior: "smooth"
    });

}


/* google place search*/

async function loadPlaces(category) {

    if (
        !PlaceClass ||
        !trip.destination
    ) {
        return;
    }


    const grid =
        document.getElementById(
            "places-grid"
        );


    const status =
        document.getElementById(
            "feed-status"
        );


    grid.innerHTML = "";


    status.textContent =
        "Finding places you'll love...";


    try {

        let places = [];


        if (category === "for-you") {

            places =
                await loadForYouPlaces();

        }

        else {

            places =
                await searchPlacesByCategory(
                    category
                );

        }


        currentPlaces = places;


        if (!places.length) {

            status.textContent =
                "No places found. Try another category.";

            return;

        }


        status.textContent =
            `${places.length} places to explore`;


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

        console.error(
            "Place search failed:",
            error
        );


        status.textContent =
            "We couldn't load places right now.";

    }

}


/*for you feed fyp :ppp*/

async function loadForYouPlaces() {

    const searches = [
        "top attractions",
        "popular restaurants",
        "best cafes",
        "museums",
        "parks"
    ];


    const results =
        await Promise.all(

            searches.map(
                query =>
                    searchText(
                        `${query} in ${trip.destination.name}`,
                        null,
                        4
                    )
            )

        );


    const combined =
        results.flat();


    const unique =
        new Map();


    combined.forEach(place => {

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


/*category search*/

async function searchPlacesByCategory(
    category
) {

    const queryNames = {

        tourist_attraction:
            `things to do in ${trip.destination.name}`,

        restaurant:
            `restaurants in ${trip.destination.name}`,

        cafe:
            `cafes in ${trip.destination.name}`,

        shopping_mall:
            `shopping in ${trip.destination.name}`,

        museum:
            `museums in ${trip.destination.name}`,

        park:
            `parks and gardens in ${trip.destination.name}`

    };


    return await searchText(
        queryNames[category] ||
            `places to visit in ${trip.destination.name}`,

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

    /*
        the user's stay gets priority for location bias. 
        otherwise use the destination.
    */

    const center =
        trip.stay
            ? {
                lat: trip.stay.lat,
                lng: trip.stay.lng
            }
            : {
                lat:
                    trip.destination.lat,

                lng:
                    trip.destination.lng
            };


    const request = {

        textQuery:
            query,

        fields: [
            "id",
            "displayName",
            "formattedAddress",
            "location",
            "rating",
            "userRatingCount",
            "photos",
            "primaryTypeDisplayName",
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
            Math.min(
                maxResults,
                20
            )

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


/*create pinterest card*/

function createPlaceCard(
    place,
    index
) {

    const card =
        document.createElement(
            "article"
        );


    card.className =
        "place-card";


    /*image*/

    const imageWrap =
        document.createElement(
            "div"
        );


    imageWrap.className =
        "place-image-wrap";


    if (
        place.photos &&
        place.photos.length
    ) {

        const photo =
            place.photos[0];


        const image =
            document.createElement(
                "img"
            );


        image.className =
            "place-image";


        image.alt =
            `Photo of ${place.displayName || "place"}`;



        const heights = [
            300,
            390,
            340,
            450,
            320
        ];


        image.style.height =
            `${heights[
                index %
                heights.length
            ]}px`;


        image.src =
            photo.getURI({
                maxWidth: 800
            });


        imageWrap.appendChild(
            image
        );


        addPhotoAttribution(
            imageWrap,
            photo
        );

    }

    else {

        const fallback =
            document.createElement(
                "div"
            );


        fallback.className =
            "no-photo";


        fallback.textContent =
            "✈";


        imageWrap.appendChild(
            fallback
        );

    }


    /*pin button*/

    const pinButton =
        document.createElement(
            "button"
        );


    pinButton.type =
        "button";


    pinButton.className =
        "pin-button";


    const isSaved =
        savedPlaceIds.includes(
            place.id
        );


    if (isSaved) {

        pinButton.classList.add(
            "saved"
        );

        pinButton.textContent =
            "♥";

    }

    else {

        pinButton.textContent =
            "♡";

    }


    pinButton.setAttribute(
        "aria-label",
        `Save ${place.displayName}`
    );


    pinButton.addEventListener(
        "click",
        () => {

            toggleSavedPlace(
                place,
                pinButton
            );

        }
    );


    imageWrap.appendChild(
        pinButton
    );


    card.appendChild(
        imageWrap
    );


    /*content*/

    const info =
        document.createElement(
            "div"
        );


    info.className =
        "place-info";


    const title =
        document.createElement(
            "h3"
        );


    title.textContent =
        place.displayName ||
        "Unnamed place";


    info.appendChild(
        title
    );


    const meta =
        document.createElement(
            "div"
        );


    meta.className =
        "place-meta";


    if (place.rating) {

        const rating =
            document.createElement(
                "span"
            );


        rating.textContent =
            `⭐ ${place.rating.toFixed(1)}`;


        if (place.userRatingCount) {

            rating.textContent +=
                ` (${place.userRatingCount.toLocaleString()})`;

        }


        meta.appendChild(
            rating
        );

    }


    if (
        trip.stay &&
        place.location
    ) {

        const distance =
            calculateDistanceMiles(
                trip.stay.lat,
                trip.stay.lng,
                place.location.lat(),
                place.location.lng()
            );


        const distanceLabel =
            document.createElement(
                "span"
            );


        distanceLabel.textContent =
            `📍 ${formatDistance(distance)} from your stay`;


        meta.appendChild(
            distanceLabel
        );

    }


    info.appendChild(
        meta
    );


    if (place.formattedAddress) {

        const address =
            document.createElement(
                "p"
            );


        address.className =
            "place-address";


        address.textContent =
            place.formattedAddress;


        info.appendChild(
            address
        );

    }


    if (place.googleMapsURI) {

        const mapsLink =
            document.createElement(
                "a"
            );


        mapsLink.className =
            "maps-link";


        mapsLink.href =
            place.googleMapsURI;


        mapsLink.target =
            "_blank";


        mapsLink.rel =
            "noopener noreferrer";


        mapsLink.textContent =
            "View on Google Maps ↗";


        info.appendChild(
            mapsLink
        );

    }


    card.appendChild(
        info
    );


    return card;

}


/*pic attriubtion*/

function addPhotoAttribution(
    container,
    photo
) {

    if (
        !photo.authorAttributions ||
        !photo.authorAttributions.length
    ) {

        return;

    }


    const attribution =
        photo.authorAttributions[0];


    const credit =
        document.createElement(
            "div"
        );


    credit.className =
        "photo-credit";


    if (attribution.uri) {

        const link =
            document.createElement(
                "a"
            );


        link.href =
            attribution.uri;


        link.target =
            "_blank";


        link.rel =
            "noopener noreferrer";


        link.textContent =
            `Photo: ${attribution.displayName}`;


        credit.appendChild(
            link
        );

    }

    else {

        credit.textContent =
            `Photo: ${attribution.displayName}`;

    }


    container.appendChild(
        credit
    );

}


/* save/unsave */

function toggleSavedPlace(
    place,
    button
) {

    const existingIndex =
        savedPlaceIds.indexOf(
            place.id
        );


    if (existingIndex >= 0) {

        savedPlaceIds.splice(
            existingIndex,
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

    }

    else {



        savedPlaceIds.push(
            place.id
        );


        button.classList.add(
            "saved"
        );


        button.textContent =
            "♥";


        showToast(
            "♡ Added to your trip"
        );

    }


    localStorage.setItem(
        "perfectDaySavedPlaces",
        JSON.stringify(
            savedPlaceIds
        )
    );


    updateSavedCount();

    renderSavedPlaces();

}


/*saved board*/

async function renderSavedPlaces() {

    const grid =
        document.getElementById(
            "saved-grid"
        );


    grid.innerHTML = "";


    if (!savedPlaceIds.length) {

        grid.innerHTML = `
            <div class="empty-saved">
                <span>🧳</span>

                <h3>
                    Nothing saved yet.
                </h3>

                <p>
                    Find something you love and tap the heart.
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
                    id:
                        savedPlaceIds[i]
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
                    "primaryTypeDisplayName",
                    "googleMapsURI"
                ]

            });


            grid.appendChild(
                createPlaceCard(
                    place,
                    i
                )
            );

        }

        catch (error) {

            console.error(
                "Could not reload saved place:",
                error
            );

        }

    }

}


/*save trip settings */

function saveTripSettings() {

    /*
        We only persist IDs + trip dates.

        Google place details can be fetched
        fresh when the page loads.
    */

    const savedTrip = {

        destinationPlaceId:
            trip.destination
                ? trip.destination.placeId
                : null,

        stayPlaceId:
            trip.stay
                ? trip.stay.placeId
                : null,

        startDate:
            trip.startDate,

        endDate:
            trip.endDate

    };


    localStorage.setItem(
        "perfectDayTrip",
        JSON.stringify(
            savedTrip
        )
    );

}


/* restore trip*/

async function restoreTrip() {

    const saved =
        JSON.parse(
            localStorage.getItem(
                "perfectDayTrip"
            ) || "null"
        );


    if (!saved) {

        renderSavedPlaces();

        return;

    }


    try {

        if (
            saved.destinationPlaceId
        ) {

            const place =
                new PlaceClass({
                    id:
                        saved.destinationPlaceId
                });


            await place.fetchFields({

                fields: [
                    "id",
                    "displayName",
                    "formattedAddress",
                    "location"
                ]

            });


            selectDestination(
                place
            );

        }


        if (
            saved.stayPlaceId
        ) {

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


            selectStay(
                stay
            );

        }


        if (
            saved.startDate &&
            saved.endDate
        ) {

            trip.startDate =
                saved.startDate;


            trip.endDate =
                saved.endDate;


            document.getElementById(
                "start-date"
            ).value =
                saved.startDate;


            document.getElementById(
                "end-date"
            ).value =
                saved.endDate;


            document.getElementById(
                "dates-label"
            ).textContent =
                formatDateRange(
                    saved.startDate,
                    saved.endDate
                );

        }

    }

    catch (error) {

        console.error(
            "Could not restore trip:",
            error
        );

    }


    renderSavedPlaces();

}


/*distance STRAIGHT LINE NOT DRIVING*/

function calculateDistanceMiles(
    lat1,
    lon1,
    lat2,
    lon2
) {



    const earthRadiusMiles =
        3958.8;


    const toRadians =
        degrees =>
            degrees *
            Math.PI /
            180;


    const dLat =
        toRadians(
            lat2 - lat1
        );


    const dLon =
        toRadians(
            lon2 - lon1
        );


    const a =
        Math.sin(
            dLat / 2
        ) ** 2
        +
        Math.cos(
            toRadians(lat1)
        )
        *
        Math.cos(
            toRadians(lat2)
        )
        *
        Math.sin(
            dLon / 2
        ) ** 2;


    const c =
        2 *
        Math.atan2(
            Math.sqrt(a),
            Math.sqrt(1 - a)
        );


    return earthRadiusMiles * c;

}


function formatDistance(
    miles
) {

    if (miles < 0.1) {

        return "<0.1 mi";

    }


    if (miles < 10) {

        return `${miles.toFixed(1)} mi`;

    }


    return `${Math.round(miles)} mi`;

}


/*date formatting*/

function formatDateRange(
    start,
    end
) {

    const startParts =
        start.split("-");


    const endParts =
        end.split("-");


    const startDate =
        new Date(
            Date.UTC(
                Number(startParts[0]),
                Number(startParts[1]) - 1,
                Number(startParts[2])
            )
        );


    const endDate =
        new Date(
            Date.UTC(
                Number(endParts[0]),
                Number(endParts[1]) - 1,
                Number(endParts[2])
            )
        );


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
        `${formatter.format(startDate)} – ` +
        `${formatter.format(endDate)}`
    );

}


/*ui helpers*/

function showSetupMessage(
    message
) {

    document.getElementById(
        "setup-message"
    ).textContent =
        message;

}


function updateSavedCount() {

    document.getElementById(
        "trip-count"
    ).textContent =
        savedPlaceIds.length;

}


let toastTimeout;


function showToast(
    message
) {

    const toast =
        document.getElementById(
            "toast"
        );


    toast.textContent =
        message;


    toast.classList.add(
        "show"
    );


    clearTimeout(
        toastTimeout
    );


    toastTimeout =
        setTimeout(
            () => {

                toast.classList.remove(
                    "show"
                );

            },
            2200
        );

}