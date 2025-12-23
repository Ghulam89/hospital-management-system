function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);

    // Define the time periods in seconds
    const periods = {
        year: 365 * 24 * 60 * 60,
        month: 30 * 24 * 60 * 60,
        day: 24 * 60 * 60,
        hour: 60 * 60,
        minute: 60,
    };

    // Iterate over the periods and find the most appropriate one
    for (const period in periods) {
        const secondsInPeriod = periods[period];

        if (seconds >= secondsInPeriod) {
            const count = Math.floor(seconds / secondsInPeriod);
            return count > 1 ? `${count} ${period}s ago` : `${count} ${period} ago`;
        }
    }

    return 'Just now'; // If the time is within a minute
}




export default getTimeAgo
