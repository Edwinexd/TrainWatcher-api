
let BASE_URL = "https://api.trafikinfo.trafikverket.se/v2/data.json"

// https://stackoverflow.com/a/27979933
function escapeXml(unsafe: String) {
    return unsafe.replace(/[<>&'"]/g, (c) => {
        switch (c) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            case '\'': return '&apos;';
            case '"': return '&quot;';
            default : return c;
        }
    });
}

function parseTrainAnnouncement(announcement: any) {
    // AdvertisedTimeAtLocation - EstimatedTimeAtLocation = Delay
    // TrackAtLocation r'([0-9])+.*'=> DisembarkationDirection = Right if $1 % 2 == 0 else left. If the station is Cst
    if (announcement.EstimatedTimeAtLocation) {
        announcement.Delay = (Date.parse(announcement.EstimatedTimeAtLocation) - Date.parse(announcement.AdvertisedTimeAtLocation)) / 1000;
    } else {
        announcement.Delay = null;
    }
    announcement.DisembarkationDirection = null;
    if (announcement.LocationSignature === "Cst") {
        let track = announcement.TrackAtLocation.match(/([0-9])+.*/);
        if (track != null) {
            announcement.DisembarkationDirection = (parseInt(track[1]) % 2 == 0) ? "Right" : "Left";
        }
    } else if (announcement.LocationSignature === "Nk") {
        let track = announcement.TrackAtLocation.match(/([0-9])+.*/);
        if (track != null) {
            announcement.DisembarkationDirection = (parseInt(track[1]) % 2 == 0) ? "Left" : "Right";
        }
    }
    return announcement;
}

export class Trafikverket {
    api_key: String;
    
    constructor(api_key: String) {
        this.api_key = api_key;
    }
    
    async getArrivals(station: String, from: String ) {
        const response: any = await fetch(BASE_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/xml",
            },
            body: "<REQUEST>" +
            "<LOGIN authenticationkey='"+ this.api_key + "' />" +
            "<QUERY objecttype='TrainAnnouncement' " +
                "orderby='AdvertisedTimeAtLocation' schemaversion='1'>" +
                "<FILTER>" +
                "<AND>" +
                    "<AND>" +
                        "<GT name='AdvertisedTimeAtLocation' " +
                                    "value='$dateadd(-0.1:00)' />" +
                        "<LT name='AdvertisedTimeAtLocation' " +
                                    // Time till 1 am the next day
                                    "value='$dateadd(0." + ((24 - new Date().getUTCHours()) + 1) + ":00)' />" +
                    "</AND>" +
                    "<EQ name='LocationSignature' value='" + escapeXml(station) + "' />" +
                    "<EQ name='ActivityType' value='Ankomst' />" +
                    "<EQ name='Advertised' value='true' />" +
					"<IN name='FromLocation' value='" + escapeXml(from) + "' />" +
                "</AND>" +
                "</FILTER>" +
                "<INCLUDE>InformationOwner</INCLUDE>" +
				"<INCLUDE>AdvertisedTrainIdent</INCLUDE>" +
                "<INCLUDE>AdvertisedTimeAtLocation</INCLUDE>" +
				"<INCLUDE>EstimatedTimeAtLocation</INCLUDE>" +
                "<INCLUDE>TrackAtLocation</INCLUDE>" +
                "<INCLUDE>FromLocation</INCLUDE>" +
                "<INCLUDE>ToLocation</INCLUDE>" +
            "</QUERY>" +
            "</REQUEST>"
        });
		
		
        const json = await response.json();
		for (let i = 0; i < json.RESPONSE.RESULT[0].TrainAnnouncement.length; i++) {
			let train = json.RESPONSE.RESULT[0].TrainAnnouncement[i];
            json.RESPONSE.RESULT[0].TrainAnnouncement[i] = parseTrainAnnouncement(train);
		}
        return json.RESPONSE.RESULT[0].TrainAnnouncement;
        
    }

    async getTrain(trainID: Number) {
        const response = await fetch(BASE_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/xml",
            },
            body: "<REQUEST>" +
                "<LOGIN authenticationkey='" + this.api_key + "' />"+
                "<QUERY objecttype='TrainAnnouncement' schemaversion='1.3'>" +
                    "<FILTER>" +
                    "<AND>" +
                        "<EQ name='AdvertisedTrainIdent' value='" + trainID + "' />" +
                        "<AND>" +
                            "<GT name='AdvertisedTimeAtLocation' " +
                                        "value='$dateadd(-0." + new Date().getUTCHours() + ":00)' />" +
                            "<LT name='AdvertisedTimeAtLocation' " +
                                        "value='$dateadd(0." + ((24 - new Date().getUTCHours()) + 1) + ":00)' />" +
                        "</AND>" +
                    "</AND>" +
                    "</FILTER>" +
                "</QUERY>" +
            "</REQUEST>"
        });
        const json: any = await response.json();
		for (let i = 0; i < json.RESPONSE.RESULT[0].TrainAnnouncement.length; i++) {
			let train = json.RESPONSE.RESULT[0].TrainAnnouncement[i];
            json.RESPONSE.RESULT[0].TrainAnnouncement[i] = parseTrainAnnouncement(train);
		}
        return json.RESPONSE.RESULT[0].TrainAnnouncement;
    }

    async getStation(id: String) {
        const response = await fetch(BASE_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/xml",
            },
            body: "<REQUEST>" +
                "<LOGIN authenticationkey='" + this.api_key + "' />"+
                "<QUERY objecttype='TrainStation' schemaversion='1.4'>" +
                    "<FILTER>" +
                        "<EQ name='LocationSignature' value='" + escapeXml(id) + "' />" +
                    "</FILTER>" +
                "</QUERY>" +
            "</REQUEST>"
        });
        const json: any = await response.json();
        return json.RESPONSE.RESULT[0].TrainStation[0];
    }

}