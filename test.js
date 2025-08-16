
import bcrypt from "bcrypt";
bcrypt.hash('organizer2!!@', 10).then(hash => console.log(hash));