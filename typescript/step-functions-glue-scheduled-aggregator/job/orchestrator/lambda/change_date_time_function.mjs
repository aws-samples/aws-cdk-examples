export const handler = async (event) => {
    const targetDatetime = new Date(event['target_datetime'])
    targetDatetime.setHours(targetDatetime.getHours() - 1)
    event['target_datetime'] = targetDatetime

    return event;
};
