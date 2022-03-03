import React from "react";
import { useAppBridge } from "@shopify/app-bridge-react";
import { getSessionToken } from "@shopify/app-bridge-utils";

const useSettingsManagement = () => {
  const app = useAppBridge();

  const [isLoading, setIsLoading] = React.useState(true);
  const [isSetLoading, setIsSetLoading] = React.useState(false);
  const [settingsObj, setSettingsObj] = React.useState();
  const [error, setError] = React.useState();

  React.useEffect(() => {
    getSettings();
  }, []);

  const getSettings = async () => {
    setIsLoading(true);

    try {
      const token = await getSessionToken(app);
      const res = await fetch('/settings', {
        headers: { Authorization: `Bearer ${token}` }
      });

      console.log(res.body);

      const responseData = await res.json();
      console.log("RES", responseData);

      if (responseData.status === 'EMPTY_SETTINGS') {
        return;
      }

      if (responseData.status === "OK_SETTINGS") {
        setSettingsObj(responseData.data);
        return;
      }

      throw Error("Unknown settings status");
    } catch (error) {
      console.log("ERROR", error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  }

  const setSettings = async productId => {
    setIsSetLoading(true);

    try {
      const token = await getSessionToken(app);
      const res = await fetch('/settings', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-type': 'text/plain'
        },
        body: JSON.stringify({ productId })
      });

      const responseData = await res.json();

      if (responseData.status === "OK_SETTINGS") {
        setSettingsObj(responseData.data);
      }

      throw Error("Unknown settings status");
    } catch (error) {
      setError(error.message);
    } finally {
      setIsSetLoading(false);
    }
  }

  const clearError = () => setError(undefined);

  return {
    settingsObj,
    isLoading,
    error,
    isSetLoading,
    setSettings,
    clearError
  }
}

export default useSettingsManagement;
