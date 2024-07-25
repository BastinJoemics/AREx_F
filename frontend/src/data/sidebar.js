import { FaTh, FaRegChartBar, FaCommentAlt, FaMapMarkedAlt } from "react-icons/fa";
import { PiProhibitFill } from "react-icons/pi";

const generateMenu = (deviceId) => [

  {
    title: "Data & History",
    icon: <FaMapMarkedAlt />,
    path: `/data-and-history`
  },
  {
    title: "Geofencing",
    icon: <PiProhibitFill />,
    path: `/geofences/${deviceId}`
  },
  {
    title: "Training",
    icon: <FaRegChartBar />,
    childrens: [
      {
        title: "Program",
        path: `/program/${deviceId}`,
      },
      {
        title: "Certification",
        path: `/certification/${deviceId}`,
      },
    ],
  },
  {
    title: "Contact Us",
    icon: <FaCommentAlt />,
    path: `/contact-us`,
  },
];

export default generateMenu;
