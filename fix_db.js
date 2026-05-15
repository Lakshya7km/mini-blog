const mongoose = require('mongoose');

const Nurse = require('./server/models/Nurse');
const Hospital = require('./server/models/Hospital');
const Doctor = require('./server/models/Doctor');

async function fixData() {
    await mongoose.connect('mongodb://lakshyam24100_db_user:X5qsnZt6Q9p6mIkd@ac-e1fiewe-shard-00-00.gbdpvfa.mongodb.net:27017,ac-e1fiewe-shard-00-01.gbdpvfa.mongodb.net:27017,ac-e1fiewe-shard-00-02.gbdpvfa.mongodb.net:27017/?ssl=true&replicaSet=atlas-xpfeyd-shard-0&authSource=admin&appName=Cluster0Minor');
    console.log('Connected to DB');

    const nurse = await Nurse.findOne({ nurseId: 'bmc_nurse_001' });
    if (nurse && nurse.name.includes('Dr.')) {
        nurse.name = 'Nurse Priya Sharma';
        await nurse.save();
        console.log('Fixed nurse name:', nurse.name);
    } else {
        console.log('Nurse already fine or not found:', nurse?.name);
    }

    const hosp = await Hospital.findOne({ hospitalId: 'bmc_reception_admin' });
    if (hosp) {
        console.log('Hospital name for bmc_reception_admin is:', hosp.name);
    } else {
        console.log('Hospital not found for bmc_reception_admin');
    }

    mongoose.disconnect();
}

fixData().catch(console.error);
