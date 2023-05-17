const nm = require("nodemailer");
const fs = require("fs");
const fsp = require("fs/promises");
const csv = require("csv-parser");

const config = require("./config.json");
const tp = nm.createTransport(config.transportConfig);
let results = [];

fs.createReadStream('target.csv')
.pipe(csv())
.on('data', (data) => results.push(data))
.on('end', () => {
  main();
});

function searchList(target, sList) {
  for (let i = 0; i < sList.length; i++) {
    if (sList[i].indexOf(target) == 0) {
      return i;
    }
  }
  return -1;
}

async function main() {    
  await tp.verify();
  const AttList = await fsp.readdir("./attachment");
  let temp = "";

  try {
    temp = (await fsp.readFile("./template.txt")).toString();
  } catch (err) {
    console.log("GAGAL LOAD TEMPLATE EMAIL");
    console.log(err);
    return;
  }

  for (let j = 0; j < results.length; j++) {
    const idx = searchList(results[j]["First Name"], AttList);
    if (idx == -1) {
      await fsp.appendFile("./log.txt", "ATTACHMENT " + results[j]["First Name"] + " TIDAK DITEMUKAN\n");
      console.log("ATTACHMENT " + results[j]["First Name"] + " TIDAK DITEMUKAN")
      return;
    } else {
      let emailText = JSON.parse(JSON.stringify(temp));
      Object.keys(results[j]).forEach(e => {
        emailText = emailText.replaceAll("<{" + e + "}>", results[j][e]);
      })
      
      try {
        console.log("MENGIRIM " + results[j]["First Name"]);
        await tp.sendMail({
          from: '"' + config.emailConfig.nama + '" <' + config.transportConfig.auth.user + '>',
          to: "mikatzukiathanas@gmail.com",
          subject: config.emailConfig.judul,
          text: emailText,
          attachments: [{
            path: "./attachment/" + AttList[idx]
          }]
        })  
        console.log("TERKIRIM " + results[j]["First Name"]);
        await fsp.appendFile("./log.txt", "TERKIRIM " + results[j]["First Name"] + "\n");
      } catch (err) {
        console.log("ERROR PENGIRIMAN " + results[j]["First Name"]);
        console.log(err); 
        await fsp.appendFile("./log.txt", "ERROR PENGIRIMAN " + results[j]["First Name"] + "\n");
        return;     
      }    
    }      
  }
}
