import {
  faCircleNotch,
  faCartShopping,
  faTrash,
  faSortUp,
  faSortDown,
  faBars,
} from "@fortawesome/free-solid-svg-icons";

import { faGithub } from "@fortawesome/free-brands-svg-icons";

import { library } from "@fortawesome/fontawesome-svg-core";

export default function initIcons() {
  return library.add(
    faCircleNotch,
    faCartShopping,
    faTrash,
    faSortUp,
    faSortDown,
    faGithub,
    faBars
  );
}
