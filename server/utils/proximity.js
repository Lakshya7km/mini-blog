function distanceScore(lat, lng, item) {
    if (!lat || !lng || !item?.location?.lat || !item?.location?.lng) return Infinity;
    const dLat = item.location.lat - Number(lat);
    const dLng = item.location.lng - Number(lng);
    return Math.sqrt(dLat * dLat + dLng * dLng);
}

exports.sortByProximity = (items, lat, lng) => {
    const list = items.map((item) => ({
        ...item,
        distance: distanceScore(lat, lng, item),
    }));
    if (lat && lng) {
        return list.sort((a, b) => a.distance - b.distance);
    }
    return list.sort((a, b) => (a.address?.city || '').localeCompare(b.address?.city || ''));
};
