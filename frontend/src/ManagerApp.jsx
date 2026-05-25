import React, { useState } from "react";
import ManagerLogin from "./ManagerLogin";
import ManagerDashboard from "./ManagerDashboard";

export default function ManagerApp() {
  const [managerUser, setManagerUser] = useState(null);

  if (!managerUser) {
    return <ManagerLogin onLogin={(user) => setManagerUser(user)} />;
  }

  return (
    <ManagerDashboard
      managerUser={managerUser}
      onLogout={() => setManagerUser(null)}
    />
  );
}
