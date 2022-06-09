
export const loadSpreadSheet = async (url) => {
    const response = await fetch(url);
    const data = await response.json();
    return data.values;
};
