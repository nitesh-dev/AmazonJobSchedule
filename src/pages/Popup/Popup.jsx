import {
  Box,
  Button,
  Card,
  Chip,
  ChipDelete,
  Divider,
  FormControl,
  FormLabel,
  Option,
  Select,
  Stack,
  Typography,
} from '@mui/joy';

import React, { useEffect, useState } from 'react';
// import { loadStorage } from './utils';

const Popup = () => {
  const [data, setData] = useState({
    jobType: 'any',
    duration: 'any',
    locations: [],
    activated: false,
  });

  // useEffect(() => {
  //   // console.log(loadStorage('amazonJobData'));
  //   chrome.storage.local.get('test', (result) => {
  //     console.log(result);
  //   });
  // }, []);

  function onChangeJobType(event, newValue) {
    if (!newValue) return;
    setData((prevData) => ({
      ...prevData,
      jobType: newValue,
    }));
  }

  function onChangeDuration(event, newValue) {
    if (!newValue) return;
    setData((prevData) => ({
      ...prevData,
      duration: newValue,
    }));
  }

  function onChangeLocations(event, newValue) {
    if (!newValue) return;
    setData((prevData) => ({
      ...prevData,
      locations: [...prevData.locations, newValue],
    }));
  }

  function onDeleteLocation(location) {
    setData((prevData) => ({
      ...prevData,
      locations: prevData.locations.filter((loc) => loc !== location),
    }));
  }

  function onToggleActivate() {
    let isActivated = !data.activated;
    chrome.runtime.sendMessage({
      action: isActivated ? 'activate' : 'deactivate',
    });

    setData((prevData) => ({
      ...prevData,
      activated: !prevData.activated,
    }));
  }

  useEffect(() => {
    loadStorage();
  }, []);

  function loadStorage() {
    chrome.storage.local.get(['settings'], (result) => {
      if (result.settings) {
        setData(result.settings);
      }
    });
  }

  useEffect(() => {
    chrome.storage.local.set({ settings: data });
  }, [data]);

  return (
    <div className="App" style={{ padding: '12px' }}>
      <Typography level="h4" sx={{ mb: 2 }}>
        Amazon Job
      </Typography>
      <Card variant="outlined">
        <FormControl>
          <Stack spacing={2}>
            <div>
              <FormLabel htmlFor="job-type">Job Type</FormLabel>
              <Select
                defaultValue="any"
                value={data.jobType}
                onChange={onChangeJobType}
                size="sm"
                slotProps={{
                  button: {
                    id: 'job-type',
                  },
                }}
              >
                <Option value="any">Any</Option>
                <Option value="full time">Full Time</Option>
                <Option value="part time">Part Time</Option>
                <Option value="flex time">Flex Time</Option>
              </Select>
            </div>

            <div>
              <FormLabel htmlFor="duration">Duration</FormLabel>
              <Select
                defaultValue="any"
                value={data.duration}
                onChange={onChangeDuration}
                size="sm"
                slotProps={{
                  button: {
                    id: 'duration',
                  },
                }}
              >
                <Option value="any">Any</Option>
                <Option value="regular">Regular</Option>
                <Option value="seasonal">Seasonal</Option>
              </Select>
            </div>

            <div>
              <FormLabel>Location</FormLabel>
              <Card size="sm">
                <Box
                  sx={{
                    display: 'flex',
                    gap: 1,
                    alignItems: 'center',
                    flexWrap: 'wrap',
                  }}
                >
                  {data.locations.length > 0 ? (
                    data.locations.map((location) => (
                      <Chip
                        key={location}
                        variant="soft"
                        color="primary"
                        size="sm"
                        endDecorator={
                          <ChipDelete
                            onClick={() => onDeleteLocation(location)}
                          />
                        }
                      >
                        {location}
                      </Chip>
                    ))
                  ) : (
                    <Chip
                      variant="soft"
                      color="primary"
                      size="sm"
                      endDecorator={<ChipDelete />}
                    >
                      Any
                    </Chip>
                  )}
                </Box>
                <Select
                  placeholder="Pick location"
                  size="sm"
                  onChange={onChangeLocations}
                >
                  <Option value="acheson">Acheson</Option>
                  <Option value="ajax">Ajax</Option>
                  <Option value="balzac">Balzac</Option>
                  <Option value="bolton">Bolton</Option>
                  <Option value="brampton">Brampton</Option>
                  <Option value="calgary">Calgary</Option>
                  <Option value="cambridge">Cambridge</Option>
                  <Option value="concord">Concord</Option>
                  <Option value="dartmouth">Dartmouth</Option>
                  <Option value="edmonton">Edmonton</Option>
                  <Option value="etobicoke">Etobicoke</Option>
                  <Option value="hamilton">Hamilton</Option>
                  <Option value="mississauga">Mississauga</Option>
                  <Option value="nisku">Nisku</Option>
                  <Option value="northborough">Northborough</Option>
                  <Option value="ottawa">Ottawa</Option>
                  <Option value="rocky view">Rocky View</Option>
                  <Option value="scarborough">Scarborough</Option>
                  <Option value="sidney">Sidney</Option>
                  <Option value="stoney creek">Stoney Creek</Option>
                  <Option value="toronto">Toronto</Option>
                  <Option value="vancouver">Vancouver</Option>
                  <Option value="vaughan">Vaughan</Option>
                  <Option value="whitby">Whitby</Option>
                  <Option value="windsor">Windsor</Option>
                </Select>
              </Card>
            </div>
            <Divider></Divider>
            <Stack direction="row" spacing={1} justifyContent="space-between">
              <Button size="sm" fullWidth="true" variant="outlined">
                Reset
              </Button>
              <Button
                onClick={onToggleActivate}
                size="sm"
                fullWidth="true"
                color={data.activated ? 'danger' : 'primary'}
              >
                {data.activated ? 'Deactivate' : 'Activate'}
              </Button>
            </Stack>
          </Stack>
        </FormControl>
      </Card>
    </div>
  );
};

export default Popup;
