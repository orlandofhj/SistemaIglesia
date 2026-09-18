package com.iglesiadelacalle.sistemaiglesia.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import com.iglesiadelacalle.sistemaiglesia.models.CronogramaTip;

@Repository
public interface CronogramaTipRepository extends JpaRepository<CronogramaTip, Integer> {
}